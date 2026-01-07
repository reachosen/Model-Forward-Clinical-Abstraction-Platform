import { scoreTaskSafety } from '../../../PlanningFactory/validators/ContextAwareValidation';
import { SAFEScorecard, SAFEObserverContext, SAFEScore } from '../../../types/safety';
import { ArchetypeType } from '../../../PlanningFactory/types';
import { SignalGrader } from '../../graders/SignalGrader';
import { SummaryGrader } from '../../graders/SummaryGrader';
import { TestCase } from '../../validation/types';

export class SAFEEvaluator {
  private signalGrader = new SignalGrader();
  private summaryGrader = new SummaryGrader();

  evaluate(
    output: any,
    taskId: string,
    metricId: string,
    archetype: ArchetypeType,
    runId: string,
    testCase?: TestCase
  ): SAFEScorecard {
    
    // 1. Reference-Free Internal Check (Legacy SAFE)
    const context: SAFEObserverContext = {
      run_id: runId,
      task_id: taskId,
      metric_id: metricId,
      archetype
    };
    const basicScorecard = scoreTaskSafety(output, context);

    // 2. Reference-Based Scoring (Dual-Truth)
    if (testCase) {
        if (taskId === 'signal_enrichment') {
            const grade = this.signalGrader.grade(testCase, output);
            const crScore: SAFEScore = {
                criterion: 'CR',
                score: grade.score,
                reasoning: grade.reasoning,
                flagged: grade.flagged
            };
            basicScorecard.scores['CR'] = crScore;
            basicScorecard.overall_label = grade.score >= 0.8 ? 'Pass' : 'Review';
        } else if (taskId === 'event_summary') {
            const grade = this.summaryGrader.grade(testCase, output);
            const acScore: SAFEScore = {
                criterion: 'AC',
                score: grade.score,
                reasoning: grade.reasoning,
                flagged: grade.flagged
            };
            basicScorecard.scores['AC'] = acScore;
            basicScorecard.overall_label = grade.score >= 0.8 ? 'Pass' : 'Review';
        }
    }

    return basicScorecard;
  }
}
