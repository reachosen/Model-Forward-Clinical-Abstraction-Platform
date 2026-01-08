import {
  StructuralSkeleton,
  DomainContext,
  ValidationResult,
  TaskExecutionResults,
  PromptPlan,
} from '../types';
import { PlanningInput } from '../../models/PlannerPlan';
import * as fs from 'fs';
import * as path from 'path';

export class S6_PlanAssemblyStage {
  async execute(
    skeleton: StructuralSkeleton,
    _taskResults: TaskExecutionResults,
    domainContext: DomainContext,
    _input: PlanningInput,
    promptPlan?: PromptPlan
  ): Promise<any> {
    const { domain } = domainContext;
    console.log(`\n[S6] Plan Assembly & Global Validation (Lean Mode)`);
    const handoffVersion = '1.0';

    // 1. Build Metric Context
    const metricContext = this.buildMetricContext(domainContext);

    // 2. Identify Task Sequence (from PromptPlan or defaults)
    const taskSequence = this.buildTaskSequence(promptPlan);

    // 3. Assemble Lean Plan
    const leanPlan = {
      handoff_metadata: {
        metric_id: skeleton.plan_metadata.concern.concern_id,
        domain: domain,
        version: handoffVersion,
        type: 'schema_seeding_package',
        generated_at: new Date().toISOString()
      },
      schema_definitions: {
        metric_info: {
          name: metricContext.metric_name,
          version: handoffVersion,
          clinical_focus: metricContext.clinical_focus,
          rationale: metricContext.rationale,
          risk_factors: metricContext.risk_factors,
          review_questions: metricContext.review_questions
        },
        metric_archetype_bindings: this.buildMetricArchetypeBindings(domainContext),
        signal_catalog: this.transformSignalsForCatalog(skeleton.clinical_config.signals.signal_groups)
      },
      execution_registry: {
        task_sequence: taskSequence
      }
    };

    console.log(`  ✅ Lean Plan Assembled`);
    return leanPlan;
  }

  private transformSignalsForCatalog(groups: any[]): Record<string, any[]> {
    const catalog: Record<string, any[]> = {};
    groups.forEach(g => {
        catalog[g.group_id] = (g.signals || []).map((s: any) => ({
            id: s.id,
            canonical_key: s.canonical_key || this.buildCanonicalKey(g.group_id, s),
            evidence_type: s.evidence_type || 'L2',
            description: s.description,
            archetypes: s.tags || []
        }));
    });
    return catalog;
  }

  private buildMetricArchetypeBindings(domainContext: DomainContext): Array<{ archetype_id: string; role: string }> {
    const packetArchetypes = domainContext.semantic_context?.packet?.metric?.archetypes || [];
    const unique = Array.from(new Set(packetArchetypes));

    if (unique.length === 0) {
      throw new Error('[S6] metric_archetype_bindings missing or empty (semantic packet has no archetypes)');
    }

    if (unique.length === 1) {
      return [{ archetype_id: unique[0], role: 'primary' }];
    }

    if (!unique.includes(domainContext.primary_archetype)) {
      throw new Error('[S6] primary_archetype not present in metric archetypes');
    }

    return unique.map((archetype_id: string) => ({
      archetype_id,
      role: archetype_id === domainContext.primary_archetype ? 'primary' : 'secondary'
    }));
  }

  private buildCanonicalKey(groupId: string, signal: any): string {
    const desc = signal?.description || signal?.name || signal?.signal_id || signal?.id || '';
    return `${groupId}|${desc}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  private buildTaskSequence(promptPlan: PromptPlan | undefined): any[] {
    if (promptPlan) {
        return promptPlan.nodes.map((node, index) => ({
            task_id: node.type,
            order: index + 1,
            type: this.inferTaskType(node.type),
            prompt_path: node.prompt_config.template_ref?.path || 'MISSING_PATH',
            output_schema: this.getOutputSchemaRef(node.type),
            archetypes_involved: [ "Preventability_Detective" ] 
        }));
    }
    return [];
  }

  private inferTaskType(taskType: string): string {
      if (taskType === 'exclusion_check') return 'gatekeeper';
      if (taskType === 'signal_enrichment') return 'extraction';
      if (taskType === 'event_summary') return 'contextualization';
      if (taskType === 'followup_questions') return 'clarification';
      if (taskType === 'clinical_review_plan') return 'synthesis';
      return 'task';
  }

  private getOutputSchemaRef(taskType: string): string {
    const map: Record<string, string> = {
        'event_summary': 'Schema_PatientEventSummary',
        'followup_questions': 'Schema_FollowupQuestions',
        'signal_enrichment': 'Schema_ClinicalSignals',
        'clinical_review_plan': 'Schema_ClinicalReviewer'
    };
    return map[taskType] || 'Schema_Generic';
  }

  private buildMetricContext(domainContext: DomainContext) {
    const packet = domainContext.semantic_context?.packet;
    const metric = packet?.metric;
    const signals = packet?.signals || {};
    if (!metric) {
      return {
        metric_id: domainContext?.domain,
        metric_name: 'Unknown metric',
        clinical_focus: '',
        rationale: '',
        risk_factors: [],
        review_questions: [],
        signal_group_definitions: {},
      };
    }

    const metricId =
      (metric as any).metric_id ||
      (metric as any).concern_id ||
      (metric as any).id ||
      metric.metric_name ||
      domainContext.domain;

    const groupDefs: Record<string, string[]> = {};
    (metric.signal_groups || []).forEach((gid: string) => {
      groupDefs[gid] = signals[gid] || [];
    });

    return {
      metric_id: metricId,
      metric_name: metric.metric_name,
      clinical_focus: metric.clinical_focus,
      rationale: metric.rationale,
      risk_factors: metric.risk_factors || [],
      review_questions: metric.review_questions || [],
      signal_group_definitions: groupDefs,
    };
  }

  validate(plan: any, domainContext: DomainContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const { domain } = domainContext;

    if (!plan.handoff_metadata) errors.push('⭐ CRITICAL: Missing handoff_metadata');
    if (!plan.schema_definitions) errors.push('⭐ CRITICAL: Missing schema_definitions');

    // INTEGRITY GATE: Verify template references exist on disk
    const tasks = plan.execution_registry?.task_sequence || [];
    tasks.forEach((task: any) => {
        if (task.prompt_path && task.prompt_path !== 'MISSING_PATH') {
            const fullPath = path.resolve(__dirname, '../../', task.prompt_path);
            if (!fs.existsSync(fullPath)) {
                errors.push(`⭐ CRITICAL: Broken template reference for ${task.task_id}: ${task.prompt_path}`);
            }
        }
    });

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        tier1_checks: errors.length === 0 ? 'PASS' : 'FAIL',
        domain
      },
    };
  }
}
