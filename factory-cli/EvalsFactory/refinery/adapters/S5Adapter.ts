import { S5_TaskExecutionStage, registerPromptOverride, clearPromptOverrides } from '../../../PlanningFactory/stages/S5_TaskExecution';
import { PromptPlan, TaskGraph, StructuralSkeleton, DomainContext, TaskOutput } from '../../../PlanningFactory/types';

export class S5Adapter {
  private stage: S5_TaskExecutionStage;

  constructor() {
    this.stage = new S5_TaskExecutionStage();
  }

  /**
   * Runs a single task using the S5 engine but with an injected prompt template.
   */
  async executeSingleTask(
    candidateTemplate: string,
    taskType: string,
    context: DomainContext,
    skeleton: StructuralSkeleton
  ): Promise<TaskOutput> {
    
    // 1. Inject the candidate prompt
    registerPromptOverride(taskType, candidateTemplate);

    // 2. Construct a single-node plan
    const promptPlan: PromptPlan = {
      graph_id: 'refinery_graph',
      nodes: [{
        id: taskType,
        type: taskType as any,
        prompt_config: {
          template_id: taskType, // S5 will resolve this to our override
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 2000,
          response_format: 'json'
        }
      }]
    };

    // 3. Construct a trivial graph
    const taskGraph: TaskGraph = {
      graph_id: 'refinery_graph',
      nodes: promptPlan.nodes.map(n => ({ id: n.id, type: n.type })),
      edges: [],
      constraints: {
        must_run: [taskType],
        optional: []
      }
    };

    try {
      // 4. Execute
      const results = await this.stage.execute(promptPlan, taskGraph, skeleton, context);
      
      // 5. Cleanup
      clearPromptOverrides();

      return results.outputs[0];
    } catch (error) {
      clearPromptOverrides();
      throw error;
    }
  }
}
