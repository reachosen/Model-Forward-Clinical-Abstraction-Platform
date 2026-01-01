export const signalEnrichmentJsonSchema = {
  type: 'object',
  properties: {
    signal_groups: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          group_id: { type: 'string' },
          signals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                signal_id: { type: 'string', description: 'Unique identifier for the clinical concept' },
                description: { type: 'string', description: 'Brief clinical context' },
                evidence_quotes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Verbatim snippets from the text supporting this signal'
                }
              },
              required: ['signal_id', 'evidence_quotes']
            }
          }
        },
        required: ['group_id', 'signals']
      }
    }
  },
  required: ['signal_groups']
};

export interface SignalEnrichmentResult {
  signal_groups: Array<{
    group_id: string;
    signals: Array<{
      signal_id: string;
      description?: string;
      evidence_quotes: string[];
    }>;
  }>;
}
