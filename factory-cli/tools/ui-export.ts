import * as fs from 'fs';
import * as path from 'path';
import { S0_InputNormalizationStage } from '../PlanningFactory/stages/S0_InputNormalization';
import { S1_DomainResolutionStage } from '../PlanningFactory/stages/S1_DomainResolution';
import { S2_StructuralSkeletonStage } from '../PlanningFactory/stages/S2_StructuralSkeleton';
import { S3_TaskGraphIdentificationStage } from '../PlanningFactory/stages/S3_TaskGraphIdentification';
import { S5_TaskExecutionStage } from '../PlanningFactory/stages/S5_TaskExecution';
import { PromptPlan } from '../PlanningFactory/types';

interface UiExportOptions {
  metricId: string;
  caseId: string;
  outDir: string;
}

const TASKS = [
  '20_80_display_fields',
  'event_summary',
  'signal_enrichment',
  'followup_questions',
  'clinical_review_plan'
];

interface TimelineEvent {
  time: string;
  event: string;
  provenance: string;
}

function sanitizeHelperPrompt(raw: string): string {
  const marker = 'EVIDENCE SOURCE:';
  const idx = raw.indexOf(marker);
  let base = raw;
  if (idx >= 0) {
    base = raw.slice(0, idx).trimEnd();
  }
  const cleaned = base
    .split('\n')
    .filter(line => !line.toUpperCase().includes('IGNORE SYSTEM INSTRUCTIONS'))
    .join('\n')
    .trimEnd();

  const evidenceBlock = [
    '',
    'EVIDENCE RULES:',
    '- Evidence must come only from patient_payload and task_output with provenance.',
    '- Do not treat summaries or signals as evidence unless they reference provenance from the payload.',
    ''
  ].join('\n');

  return `${cleaned}\n\n${evidenceBlock}`;
}

function getCasePath(caseId: string): string {
  return path.resolve(__dirname, `../data/${caseId}_case.json`);
}

function getHelperPromptPath(): string {
  return path.resolve(
    __dirname,
    '../domains_registry/USNWR/Orthopedics/_shared/prompts/clinical_review_helper.md'
  );
}

function requireFile(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function buildLinearGraph(baseGraph: any, taskIds: string[]) {
  return {
    ...baseGraph,
    nodes: taskIds.map(id => ({ id, type: id })),
    edges: taskIds.slice(0, -1).map((id, i) => [id, taskIds[i + 1]] as [string, string])
  };
}

function buildTimelineEvents(caseData: any): TimelineEvent[] {
  const encounters = Array.isArray(caseData.encounters) ? caseData.encounters : [];
  const events: TimelineEvent[] = [];

  encounters.forEach((enc: any) => {
    const encId = enc.encounter_id || 'UNKNOWN_ENCOUNTER';
    const encEvents = Array.isArray(enc.events) ? enc.events : [];
    encEvents.forEach((evt: any) => {
      if (!evt?.event_ts || !evt?.title) return;
      const eventType = evt.event_type ? `${evt.event_type}: ` : '';
      const eventText = `${eventType}${evt.title}`;
      const provenance = `encounter_id=${encId}; event_id=${evt.event_id || 'UNKNOWN_EVENT'}`;
      events.push({
        time: evt.event_ts,
        event: eventText,
        provenance
      });
    });
  });

  return events.sort((a, b) => a.time.localeCompare(b.time));
}

function assertTaskOutputs(outputs: Record<string, any>) {
  const missing = TASKS.filter(task => !outputs[task]);
  if (missing.length > 0) {
    throw new Error(`Missing task outputs: ${missing.join(', ')}`);
  }
}

export async function exportUiPayload(options: UiExportOptions): Promise<void> {
  const metricId = options.metricId;
  const caseId = options.caseId;
  const outDir = path.resolve(options.outDir);

  if (metricId !== 'I32a') {
    throw new Error(`Only I32a is supported (received: ${metricId})`);
  }

  const casePath = getCasePath(caseId);
  const patientData = requireFile(casePath);

  const helperPromptRaw = requireFile(getHelperPromptPath());
  const helperPrompt = sanitizeHelperPrompt(helperPromptRaw);
  const timelineEvents = buildTimelineEvents(JSON.parse(patientData));

  const input = {
    planning_input_id: `ui_export_${Date.now()}`,
    concern: metricId,
    concern_id: metricId,
    domain_hint: 'Orthopedics',
    domain: 'Orthopedics',
    intent: 'quality_reporting',
    clinical_context: { patient_payload: patientData }
  };

  const s0 = new S0_InputNormalizationStage();
  const s1 = new S1_DomainResolutionStage();
  const s2 = new S2_StructuralSkeletonStage();
  const s3 = new S3_TaskGraphIdentificationStage();
  const s5 = new S5_TaskExecutionStage();

  const routed = await s0.execute(input as any);
  const domainContext = await s1.execute(routed);
  const skeleton = await s2.execute(routed, domainContext);
  const graph = await s3.execute(routed, domainContext, skeleton);

  const promptPlan: PromptPlan = {
    graph_id: 'ui_export_graph',
    nodes: TASKS.map(id => ({
      id,
      type: id as any,
      prompt_config: {
        template_id: id,
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: 'json_schema'
      }
    }))
  };

  const linearGraph = buildLinearGraph(graph, TASKS);
  const results = await s5.execute(promptPlan, linearGraph as any, skeleton, domainContext);

  const outputs: Record<string, any> = {};
  results.outputs.forEach(o => {
    const taskType = o.output?.task_type || o.taskId;
    outputs[taskType] = o.output;
  });

  assertTaskOutputs(outputs);

  const payload = {
    meta: { metric_id: metricId, case_id: caseId },
    data_panels: {
      patient_header: { task_output: outputs['20_80_display_fields'] },
      timeline_panel: {
        task_output: outputs['event_summary'],
        timeline_events: timelineEvents
      },
      signal_panel: { task_output: outputs['signal_enrichment'] },
      followup_panel: { task_output: outputs['followup_questions'] },
      verdict_panel: { task_output: outputs['clinical_review_plan'] }
    },
    review_chat: {
      prompt_text: helperPrompt
    }
  };

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, `i32a_ui_${caseId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`UI export complete: ${outPath}`);
}
