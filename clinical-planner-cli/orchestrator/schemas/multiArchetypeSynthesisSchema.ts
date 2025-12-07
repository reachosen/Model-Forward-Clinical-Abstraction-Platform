import { SignalGroup } from './signalEnrichmentSchema';
import { ClinicalTool } from '../../models/ResearchBundle';

export interface MultiArchetypeSynthesisResult {
  final_determination: string;
  synthesis_rationale: string;
  merged_signal_groups: SignalGroup[];
  unified_clinical_tools: ClinicalTool[];
}

export const multiArchetypeSynthesisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['final_determination', 'synthesis_rationale', 'merged_signal_groups', 'unified_clinical_tools'],
  properties: {
    final_determination: { type: 'string' },
    synthesis_rationale: { type: 'string' },
    merged_signal_groups: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['group_id', 'signals'],
        properties: {
          group_id: { type: 'string' }, // Enum can be reused from signalEnrichmentSchema if strictness desired
          signals: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['signal_id', 'description', 'provenance'],
              properties: {
                signal_id: { type: 'string' },
                description: { type: 'string' },
                evidence_type: { type: 'string' }, // L1/L2/L3
                provenance: { 
                  type: 'object',
                  properties: {
                    source_text: { type: 'string' },
                    timestamps: { type: 'string' }
                  }
                },
                feasibility: { 
                  type: 'object',
                  properties: {
                    cpt_codes: { type: 'array', items: { type: 'string' } },
                    icd_codes: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }
    },
    unified_clinical_tools: {
      type: 'array',
      items: {
        type: 'object',
        // Minimal definition for tools in synthesis output
        properties: {
          tool_id: { type: 'string' },
          description: { type: 'string' }
        }
      }
    }
  }
} as const;
