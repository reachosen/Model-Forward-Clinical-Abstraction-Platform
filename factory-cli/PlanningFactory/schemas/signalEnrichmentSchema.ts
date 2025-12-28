export interface SignalEnrichmentResult {
  signal_groups: Array<{
    group_id: string;
    signals: Array<{
      signal_id: string;
      description: string;
      evidence_type: 'verbatim_text' | 'structured_field';
      provenance: string;
      tags: string[];
    }>;
  }>;
}

export const signalEnrichmentJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['signal_groups'],
  properties: {
    signal_groups: {
      type: 'array',
      items: {
        type: 'object',
        required: ['group_id', 'signals'],
        properties: {
          group_id: { type: 'string' },
          signals: {
            type: 'array',
            items: {
              type: 'object',
              required: ['signal_id', 'description', 'evidence_type', 'provenance', 'tags'],
              properties: {
                signal_id: { type: 'string' },
                description: { type: 'string' },
                evidence_type: { 
                  type: 'string', 
                  enum: ['verbatim_text', 'structured_field'] 
                },
                provenance: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }
} as const;
