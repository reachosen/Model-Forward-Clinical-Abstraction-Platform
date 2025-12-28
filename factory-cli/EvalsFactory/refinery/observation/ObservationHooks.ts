import { Observation, ObservationLevel } from './ObservationRecorder';
import { ObservationContext } from './ObservationTypes';

export function recordLLMCall(opts: {
  runId?: string;
  stageId?: string;
  taskId?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}): void {
  Observation.logMetric(
    'llm_call_config',
    'pipeline',
    { runId: opts.runId, stageId: opts.stageId, promptName: opts.taskId },
    {
      raw: {
        model: opts.model,
        temperature: opts.temperature,
        max_tokens: opts.max_tokens,
        top_p: opts.top_p,
      },
    }
  );
}

export function recordGateOutcome(opts: {
  stageId: string;
  gateResult: 'HALT' | 'WARN' | 'PASS';
  missingFieldCount?: number;
  totalFieldCount?: number;
  runId?: string;
}): void {
  const { stageId, gateResult, missingFieldCount, totalFieldCount, runId } = opts;
  const level: ObservationLevel = 'pipeline';

  Observation.logMetric(
    'sparse_data_friendliness',
    level,
    { runId, stageId },
    {
      labelValue: gateResult,
      raw: { missingFieldCount, totalFieldCount },
    }
  );
}

export function recordSchemaOutcome(opts: {
  promptName: string;
  promptCategory?: ObservationContext['promptCategory'];
  ok: boolean;
  runId?: string;
}): void {
  const { promptName, promptCategory, ok, runId } = opts;

  Observation.logMetric(
    'sparse_data_friendliness',
    'prompt',
    { runId, promptName, promptCategory },
    {
      labelValue: ok ? 'schema_ok' : 'schema_failed',
    }
  );
}

export function recordContextMatrixUsage(opts: {
  stageId: string;
  runId?: string;
  domain?: string;
  archetype?: string;
  rulesApplied: string[];
}): void {
  const { stageId, runId, domain, archetype, rulesApplied } = opts;

  Observation.logMetric(
    'branching_complexity',
    'pipeline',
    { runId, stageId, domain, archetype },
    {
      numericValue: rulesApplied.length,
      raw: { rulesApplied },
    }
  );
}

export function recordPlanValidationResult(opts: {
  runId?: string;
  tier1Errors: number;
  tier2Warnings: number;
}): void {
  const { runId, tier1Errors, tier2Warnings } = opts;

  Observation.logMetric(
    'autonomy_window',
    'pipeline',
    { runId },
    {
      raw: { tier1Errors, tier2Warnings },
    }
  );
}

export function recordRecallCoverageResult(opts: {
  runId?: string;
  promptName: string;
  promptCategory?: ObservationContext['promptCategory'];
  mustFindMissingCount: number;
  forbiddenFoundCount: number;
}): void {
  const { runId, promptName, promptCategory, mustFindMissingCount, forbiddenFoundCount } = opts;

  Observation.logMetric(
    'sparse_data_friendliness',
    'category',
    { runId, promptName, promptCategory },
    {
      raw: { mustFindMissingCount, forbiddenFoundCount },
    }
  );
}
