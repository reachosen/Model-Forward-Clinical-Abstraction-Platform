import { Observation } from './ObservationRecorder';
import { ObservationContext } from './ObservationTypes';

const PRESCRIPTIVE_KEYWORDS = [
  'DO NOT',
  "DON'T",
  'MUST',
  'MUST NOT',
  'ONLY',
  'NEVER',
  'STRICT',
  'REQUIRED',
  'REQUIREMENTS:',
  'YOU MAY ONLY',
];

export function computeInstructionDensity(promptText: string): number {
  const lines = promptText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return 0;

  let prescriptiveCount = 0;
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (PRESCRIPTIVE_KEYWORDS.some((kw) => upper.includes(kw))) {
      prescriptiveCount += 1;
    }
  }

  return prescriptiveCount / lines.length; // ratio 0..1
}

export function logInstructionDensity(promptText: string, ctx: ObservationContext): void {
  const density = computeInstructionDensity(promptText);

  Observation.logMetric('instruction_density', 'prompt', ctx, {
    numericValue: density,
  });
}

export interface AutonomyWindowInputs {
  requiredFieldCount: number;
  optionalFieldCount: number;
  enumFieldCount: number;
  hardProhibitionsCount: number;
}

export function estimateAutonomyWindowScore(inputs: AutonomyWindowInputs): number {
  const { requiredFieldCount, optionalFieldCount, enumFieldCount, hardProhibitionsCount } = inputs;

  // Simple heuristic: more constraints lower the score
  const constraintWeight = requiredFieldCount + enumFieldCount + hardProhibitionsCount;
  const flexibilityWeight = optionalFieldCount + 1; // avoid division by zero

  const rawScore = flexibilityWeight / (flexibilityWeight + constraintWeight);
  return rawScore;
}

export function logAutonomyWindowScore(inputs: AutonomyWindowInputs, ctx: ObservationContext): void {
  const score = estimateAutonomyWindowScore(inputs);

  Observation.logMetric('autonomy_window', 'prompt', ctx, {
    numericValue: score,
    raw: inputs,
  });
}
