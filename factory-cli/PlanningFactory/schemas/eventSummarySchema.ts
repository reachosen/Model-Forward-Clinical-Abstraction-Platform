export interface EventSummaryResult {
  event_summary: string;
  timeline_complete: boolean;
  key_timestamps: string[];
  display_fields: Array<{
    order: number;
    label: string;
    value: string;
  }>;
}

export const eventSummaryJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['event_summary', 'timeline_complete', 'key_timestamps', 'display_fields'],
  properties: {
    event_summary: { type: 'string', description: 'Comprehensive narrative summary' },
    timeline_complete: { type: 'boolean' },
    key_timestamps: { 
      type: 'array', 
      items: { type: 'string' } 
    },
    display_fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          order: { type: 'number' },
          label: { type: 'string' },
          value: { type: 'string' }
        },
        required: ['order', 'label', 'value']
      },
      minItems: 8,
      maxItems: 8
    }
  }
} as const;