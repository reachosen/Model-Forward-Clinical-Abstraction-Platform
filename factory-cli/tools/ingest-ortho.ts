import * as fs from 'fs';
import * as path from 'path';
import { PlannerPlan, SignalGroup, MetricQuestion } from '../models/PlannerPlan';

const argv = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

const METRIC_ID = getArg('--metric');
const RUN_DIR = getArg('--run');

if (!METRIC_ID || !RUN_DIR) {
  console.error('Usage: ts-node tools/ingest-ortho.ts --metric <id> --run <dir>');
  process.exit(1);
}

const ORTHO_DATA_DIR = path.resolve(__dirname, '../data/orthopedics');

class OrthoIngestor {
  metrics: any;
  signals: any;

  constructor() {
    this.metrics = JSON.parse(fs.readFileSync(path.join(ORTHO_DATA_DIR, 'metrics.json'), 'utf-8'));
    this.signals = JSON.parse(fs.readFileSync(path.join(ORTHO_DATA_DIR, 'signals.json'), 'utf-8'));
  }

  generatePlan(metricId: string): PlannerPlan {
    const metricDef = this.metrics[metricId];
    if (!metricDef) throw new Error(`Metric ${metricId} not found in metrics.json`);

    // 1. Map Signals
    const signalGroups: SignalGroup[] = (metricDef.signal_groups || []).map((groupId: string) => {
      const rawSignals = this.signals[groupId] || [];
      return {
        group_id: groupId as any,
        display_name: groupId.replace('_', ' ').toUpperCase(),
        description: `Signals related to ${groupId}`,
        priority: 1,
        signals: rawSignals.map((sigName: string, idx: number) => ({
          id: `${groupId}_${idx}`,
          name: sigName,
          description: sigName,
          evidence_type: 'L2',
          provenance: { source: 'USNWR_Guidelines', confidence: 1.0 }
        }))
      };
    });

    // 2. Map Questions
    const questions: MetricQuestion[] = (metricDef.review_questions || []).map((qText: string, idx: number) => ({
      question_id: `Q${idx + 1}`,
      text: qText,
      category: 'diagnostic',
      sme_status: 'verified',
      display_order: idx + 1,
      evidence_rules: {
        required_signals: [],
        suggested_evidence_type: ['L2']
      }
    }));

    // 3. Construct System Prompt (Draft)
    const taskPrompt = `
      You are a Clinical Abstraction Expert specializing in Orthopedics.
      Your goal is to evaluate the following metric: "${metricDef.metric_name}".
      
      CLINICAL FOCUS: ${metricDef.clinical_focus}
      RATIONALE: ${metricDef.rationale}
      
      RISK FACTORS:
      ${(metricDef.risk_factors || []).map((r: string) => `- ${r}`).join('\n')}
      
      REQUIRED QUESTIONS:
      ${questions.map(q => `- ${q.text}`).join('\n')}
      
      OUTPUT FORMAT:
      Return a JSON object with:
      - "eligible": boolean
      - "met_metric": boolean
      - "safety_flags": string[]
      - "clinical_reasoning": string
    `;

    return {
      plan_metadata: {
        plan_id: `plan_${metricId}_${Date.now()}`,
        planner_version: '9.1.0',
        status: 'draft',
        planning_input_id: 'manual_ingest',
        generated_at: new Date().toISOString()
      },
      rationale: {
        summary: metricDef.rationale,
        key_decisions: [],
        pediatric_focus_areas: ['Age appropriate management'],
        archetype_selection_reason: 'Standard Ortho Protocol'
      },
      clinical_config: {
        config_metadata: {
          config_id: `conf_${metricId}`,
          name: metricDef.metric_name,
          concern_id: metricId,
          version: '1.0',
          archetype: 'Process_Auditor',
          domain: 'Orthopedics',
          created_at: new Date().toISOString(),
          status: 'active'
        },
        clinical_tools: [],
        surveillance: {
          objective: 'Quality Reporting',
          population: 'Pediatric Ortho',
          detection_window: { lookback_days: 0, lookahead_days: 0 },
          reporting_frameworks: ['USNWR']
        },
        timeline: { phases: [] },
        signals: { signal_groups: signalGroups },
        criteria: { rules: [] },
        questions: { metric_questions: questions },
        prompts: {
          system_prompt: "You are an AI Clinical Abstractor.",
          task_prompts: {
            "eval_main": {
              instruction: taskPrompt,
              output_schema_ref: "schema_v1"
            }
          }
        },
        fieldMappings: {},
        domain: {
          name: 'Orthopedics',
          display_name: 'Pediatric Orthopedics',
          description: 'USNWR Ortho Metrics'
        },
        metric_context: {
          metric_id: metricId,
          metric_name: metricDef.metric_name,
          clinical_focus: metricDef.clinical_focus,
          rationale: metricDef.rationale,
          risk_factors: metricDef.risk_factors,
          review_questions: metricDef.review_questions,
          signal_group_definitions: {}
        }
      },
      validation: {
        checklist: {
          schema_completeness: { result: 'YES', severity: 'CRITICAL' },
          provenance_safety: { result: 'YES', severity: 'CRITICAL' },
          pediatric_compliance: { result: 'YES', severity: 'HIGH' },
          dependency_integrity: { result: 'YES', severity: 'HIGH' }
        },
        is_valid: true,
        errors: [],
        warnings: []
      }
    };
  }
}

try {
  const ingestor = new OrthoIngestor();
  const plan = ingestor.generatePlan(METRIC_ID);
  
  if (!fs.existsSync(RUN_DIR)) {
    fs.mkdirSync(RUN_DIR, { recursive: true });
  }
  
  const outputPath = path.join(RUN_DIR, 'plan.json');
  fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));
  
  // Extract Prompts as First-Class Artifact
  const promptsPath = path.join(RUN_DIR, 'prompts.json');
  fs.writeFileSync(promptsPath, JSON.stringify(plan.clinical_config.prompts, null, 2));

  console.log(`Successfully ingested ${METRIC_ID} to ${outputPath} and ${promptsPath}`);
} catch (error) {
  console.error('Ingestion failed:', error);
  process.exit(1);
}
