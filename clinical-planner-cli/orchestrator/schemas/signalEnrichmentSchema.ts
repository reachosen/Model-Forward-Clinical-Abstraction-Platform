export type SignalGroupId =
  | 'rule_in'
  | 'rule_out'
  | 'delay_drivers'
  | 'outcome_risks'
  | 'safety_signals'
  | 'documentation_gaps'
  | 'infection_risks'
  | 'readmission_risks'
  | 'bundle_compliance';

export interface Provenance {
  evidence_type: 'verbatim_text' | 'structured_field';
  note_id?: string;
  section?: string;
  start_char?: number;
  end_char?: number;
  snippet?: string; 
}

export interface TimeWindow {
  start_ts?: string; // ISO-8601
  end_ts?: string;
}

export interface Signal {
  signal_id: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
  tags?: string[];
  provenance: Provenance;
  time_window?: TimeWindow;
}

export interface SignalGroup {
  group_id: SignalGroupId;
  signals: Signal[];
}

export interface SignalEnrichmentResult {
  signal_groups: SignalGroup[];
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
        additionalProperties: false,
        required: ['group_id', 'signals'],
        properties: {
          group_id: {
            type: 'string',
            enum: [
              'rule_in',
              'rule_out',
              'delay_drivers',
              'outcome_risks',
              'safety_signals',
              'documentation_gaps',
              'infection_risks',
              'readmission_risks',
              'bundle_compliance'
            ]
          },
          signals: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['signal_id', 'description', 'provenance'],
              properties: {
                signal_id: { type: 'string' },
                description: { type: 'string' },
                severity: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  nullable: true
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  nullable: true
                },
                time_window: {
                  type: 'object',
                  nullable: true,
                  additionalProperties: false,
                  properties: {
                    start_ts: { type: 'string' },
                    end_ts: { type: 'string' }
                  }
                },
                provenance: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['evidence_type'],
                  properties: {
                    evidence_type: {
                      type: 'string',
                      enum: ['verbatim_text', 'structured_field']
                    },
                    note_id: { type: 'string', nullable: true },
                    section: { type: 'string', nullable: true },
                    start_char: { type: 'number', nullable: true },
                    end_char: { type: 'number', nullable: true },
                    snippet: { type: 'string', nullable: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
} as const;
