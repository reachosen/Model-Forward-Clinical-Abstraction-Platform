import { S5Adapter } from '../adapters/S5Adapter';
import { DatasetLoader } from '../loaders/DatasetLoader';
import { SAFEEvaluator } from '../evaluators/SAFEEvaluator';
import { RefineryRunConfig, RefineryReport } from '../config/definitions';
import { DomainContext, StructuralSkeleton } from '../../../PlanningFactory/types';

export class RefineryRunner {
  constructor(
    private s5Adapter: S5Adapter,
    private datasetLoader: DatasetLoader,
    private evaluator: SAFEEvaluator
  ) {}

  async run(config: RefineryRunConfig, baseContext?: DomainContext): Promise<RefineryReport> {
    console.log(`🚧 Refinery Run: ${config.run_id}`);
    console.log(`   Task: ${config.task_type}`);
    console.log(`   Candidate: ${config.candidate.version_label}`);

    const testCases = this.datasetLoader.loadGoldenSet(config.dataset_id);
    const casesToRun = config.sample_size ? testCases.slice(0, config.sample_size) : testCases;
    
    console.log(`   Loaded ${casesToRun.length} cases.`);

    const details: any[] = [];
    let passedCount = 0;
    let failedCount = 0;

    for (const tc of casesToRun) {
      // 1. Build Context from Test Case
      const context: DomainContext = baseContext ? {
          ...baseContext,
          patient_payload: tc.patient_payload
      } : {
        domain: 'Orthopedics', 
        primary_archetype: 'Process_Auditor',
        archetypes: ['Process_Auditor'],
        patient_payload: tc.patient_payload,
        semantic_context: {
          packet: {
            metric: {
              metric_name: config.metric_id,
              metric_type: 'outcome_oriented_process',
              clinical_focus: 'Evaluated by refinery',
              rationale: 'Testing',
              signal_groups: ['delay_drivers', 'outcome_risks', 'safety_signals', 'documentation_gaps'],
              risk_factors: [],
              review_questions: [],
              submetrics: [],
              priority_for_clinical_review: 'high'
            },
            signals: {},
            priorities: {} as any
          },
          ranking: undefined
        }
      };

      const skeleton: StructuralSkeleton = {
        plan_metadata: {
          plan_id: 'refinery_plan',
          concern: {
            concern_id: config.metric_id,
            concern_type: 'USNWR',
            domain: baseContext?.domain || 'Orthopedics'
          }
        },
        clinical_config: { 
          signals: { 
            signal_groups: [] 
          } 
        }
      };

      try {
        const output = await this.s5Adapter.executeSingleTask(
          config.candidate.prompt_template,
          config.task_type,
          context,
          skeleton
        );


        // 3. Evaluate
        const scorecard = this.evaluator.evaluate(
          output.output,
          config.task_type,
          config.metric_id,
          'Process_Auditor',
          config.run_id,
          tc
        );

        if (scorecard.overall_label === 'Pass') passedCount++;
        else failedCount++;

        details.push({
          case_id: tc.test_id,
          output: output.output,
          scorecard
        });

      } catch (err) {
        console.error(`   ❌ Case ${tc.test_id} failed:`, err);
        failedCount++;
      }
    }

    // 4. Report
    return {
      run_id: config.run_id,
      overall_score: passedCount / (passedCount + failedCount),
      safe_scorecard: {} as any, // TODO: Aggregate logic
      passed_cases: passedCount,
      failed_cases: failedCount,
      details
    };
  }
}
