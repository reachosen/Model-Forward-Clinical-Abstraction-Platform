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

    // 1. Build Metric Context
    const metricContext = this.buildMetricContext(domainContext);

    // 2. Identify Task Sequence (from PromptPlan or defaults)
    const taskSequence = this.buildTaskSequence(promptPlan);

    // 3. Assemble Lean Plan
    const leanPlan = {
      handoff_metadata: {
        metric_id: skeleton.plan_metadata.concern.concern_id,
        domain: domain,
        version: '1.0',
        type: 'schema_seeding_package',
        generated_at: new Date().toISOString()
      },
      schema_definitions: {
        metric_info: {
          name: metricContext.metric_name,
          clinical_focus: metricContext.clinical_focus,
          rationale: metricContext.rationale,
          risk_factors: metricContext.risk_factors,
          review_questions: metricContext.review_questions
        },
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
            evidence_type: s.evidence_type || 'L2',
            description: s.description,
            archetypes: s.tags || []
        }));
    });
    return catalog;
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