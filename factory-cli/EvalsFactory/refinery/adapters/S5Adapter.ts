import { callLLMForJSON } from '../../../PlanningFactory/planner/llmClient';
import { DomainContext, StructuralSkeleton, TaskOutput } from '../../../PlanningFactory/types';
import { ContractSynthesizer } from '../../../SchemaFactory/generators/contract_synthesizer';
import { buildSystemPrompt } from '../../../PlanningFactory/utils/promptBuilder';
import * as path from 'path';

export class S5Adapter {
  private synthesizer: ContractSynthesizer;

  constructor() {
    this.synthesizer = new ContractSynthesizer(path.resolve(__dirname, '../../../../factory-cli/domains_registry'));
  }

  /**
   * Runs a single task using the LLM.
   */
  async executeSingleTask(
    candidateTemplate: string,
    taskType: string,
    context: DomainContext,
    _skeleton: StructuralSkeleton
  ): Promise<TaskOutput> {
    
    let hydratedTaskInstructions = candidateTemplate;
    
    // 1. Load Metric Context for System Prompt
    const metric = context.semantic_context.packet?.metric;
    const signals = context.semantic_context.packet?.signals || {};
    
    const metricContext = {
        metric_id: metric?.metric_name || context.domain,
        metric_name: metric?.metric_name || "Unknown Metric",
        clinical_focus: metric?.clinical_focus || "",
        rationale: metric?.rationale || "",
        risk_factors: metric?.risk_factors || [],
        review_questions: metric?.review_questions || [],
        signal_group_definitions: signals
    };

    // 2. Build THE RICH SYSTEM PROMPT (Persona + Framing)
    const richSystemPersona = buildSystemPrompt(metricContext);

    // 3. Hydrate Task-Specific Instructions
    try {
        const promptContext = {
            ...context,
            ortho_context: context.semantic_context.packet,
            ranking_context: context.semantic_context.ranking,
            archetype: context.primary_archetype
        };

        const variables = (this.synthesizer as any).getVariablesForTask(taskType, promptContext);
        for (const [key, value] of Object.entries(variables)) {
            hydratedTaskInstructions = hydratedTaskInstructions.split(`{{${key}}}`).join(value as string);
        }
    } catch (e) {
        console.warn(`   ⚠️  Manual hydration failed for ${taskType}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 4. Combine into final System Prompt
    const finalSystemPrompt = `${richSystemPersona}\n\n${hydratedTaskInstructions}`;

    const userPrompt = "PATIENT_PAYLOAD:\n" + (context.patient_payload || "No payload provided.");

    // 5. Call LLM
    try {
        const parsed = await callLLMForJSON(
            finalSystemPrompt,
            userPrompt,
            {
                model: 'gpt-4o-mini',
                temperature: 0,
                maxTokens: 2000
            }
        );

        // MAP TO EngineOutput structure for graders
        let structuredOutput = parsed;
        if (taskType === 'signal_enrichment' && parsed.signal_groups) {
            // SignalGrader expects signal_objects
            const signals: any[] = [];
            parsed.signal_groups.forEach((g: any) => {
                if (g.signals) {
                    g.signals.forEach((s: any) => {
                        signals.push({
                            ...s,
                            group_id: g.group_id
                        });
                    });
                }
            });
            structuredOutput = {
                raw_input: context.patient_payload || "",
                signal_objects: signals,
                signals: signals.map(s => s.description || s.signal_id),
                summary: ""
            };
        } else if (taskType === 'event_summary') {
            structuredOutput = {
                raw_input: context.patient_payload || "",
                summary: parsed.event_summary || parsed.summary || "",
                signals: [],
                followup_questions: []
            };
        }

        return {
            taskId: taskType,
            output: structuredOutput,
            validation: {
                passed: true,
                errors: [],
                warnings: []
            }
        };

    } catch (error: any) {
        return {
            taskId: taskType,
            output: { error: error.message },
            validation: {
                passed: false,
                errors: [error.message],
                warnings: []
            }
        };
    }
  }
}
