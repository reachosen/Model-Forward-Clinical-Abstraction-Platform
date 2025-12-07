export type OverallCall = 'clear_pass' | 'clear_fail' | 'needs_clinical_review';

export interface EventSummaryResult {
  event_summary: string;
  metric_alignment: string;
  overall_call: OverallCall;
  confidence: number;
}

export const eventSummaryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['event_summary', 'metric_alignment', 'overall_call', 'confidence'],
  properties: {
    event_summary: { type: 'string' },
    metric_alignment: { type: 'string' },
    overall_call: {
      type: 'string',
      enum: ['clear_pass', 'clear_fail', 'needs_clinical_review']
    },
    confidence: { type: 'number' }
  }
} as const;
