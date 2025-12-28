export interface EventSummaryResult {
  event_summary: string;
  timeline_complete: boolean;
  key_timestamps: string[];
}

export const eventSummaryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['event_summary', 'timeline_complete', 'key_timestamps'],
  properties: {
    event_summary: { type: 'string', description: 'Comprehensive narrative summary' },
    timeline_complete: { type: 'boolean' },
    key_timestamps: { 
      type: 'array', 
      items: { type: 'string' } 
    }
  }
} as const;