import { PlannerPlanV2 } from '../../models/PlannerPlan';

/**
 * PlanAdapter
 * 
 * Adapts the new "Lean Plan" (Handoff Artifact) back into the
 * legacy PlannerPlanV2 structure required by EvalsFactory.
 */
export class PlanAdapter {
  static adapt(leanPlan: any): PlannerPlanV2 {
    // 1. Reconstruct Task Prompts
    const taskPrompts: Record<string, any> = {};
    if (leanPlan.execution_registry?.task_sequence) {
      leanPlan.execution_registry.task_sequence.forEach((task: any) => {
        taskPrompts[task.task_id] = {
          template_ref: {
            path: task.prompt_path,
            context_keys: ['metric_context', 'patient_payload']
          },
          output_schema_ref: task.output_schema
        };
      });
    }

    // 2. Reconstruct Signal Groups
    const signalGroups: any[] = [];
    if (leanPlan.schema_definitions?.signal_catalog) {
      Object.entries(leanPlan.schema_definitions.signal_catalog).forEach(([groupId, signals]) => {
        signalGroups.push({
          group_id: groupId,
          display_name: groupId, // Simple fallback
          signals: (signals as any[]).map(s => ({
            id: s.id,
            evidence_type: s.evidence_type,
            description: s.description
          }))
        });
      });
    }

    // 3. Return Legacy Structure
    return {
      plan_metadata: {
        concern: {
          concern_id: leanPlan.handoff_metadata.metric_id,
          domain: leanPlan.handoff_metadata.domain,
          concern_type: 'USNWR', // Safe default
          care_setting: 'inpatient'
        },
        plan_id: 'lean_adapted',
        plan_version: leanPlan.handoff_metadata.version,
        schema_version: '9.1'
      } as any,

      clinical_config: {
        prompts: {
          task_prompts: taskPrompts,
          system_prompt: 'ADAPTED_FROM_LEAN_PLAN'
        },
        signals: {
          signal_groups: signalGroups
        },
        metric_context: {
          metric_id: leanPlan.handoff_metadata.metric_id,
          metric_name: leanPlan.schema_definitions.metric_info.name,
          risk_factors: leanPlan.schema_definitions.metric_info.risk_factors,
          review_questions: leanPlan.schema_definitions.metric_info.review_questions
        }
      } as any,

      validation: {
        is_valid: true
      } as any,
      
      quality: {} as any
    };
  }
}
