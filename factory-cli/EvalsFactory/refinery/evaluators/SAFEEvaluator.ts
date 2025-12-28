import { scoreTaskSafety } from '../../../PlanningFactory/validators/ContextAwareValidation';
import { SAFEScorecard, SAFEObserverContext } from '../../../types/safety';
import { ArchetypeType } from '../../../PlanningFactory/types';

export class SAFEEvaluator {
  evaluate(
    output: any,
    taskId: string,
    metricId: string,
    archetype: ArchetypeType,
    runId: string
  ): SAFEScorecard {
    
    const context: SAFEObserverContext = {
      run_id: runId,
      task_id: taskId,
      metric_id: metricId,
      archetype
    };

    return scoreTaskSafety(output, context);
  }
}
