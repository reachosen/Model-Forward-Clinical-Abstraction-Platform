export interface DisplayFieldsResult {
  display_fields: Array<{
    order: number;
    label: string;
    value: string;
  }>;
}

export const displayFieldsJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['display_fields'],
  properties: {
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