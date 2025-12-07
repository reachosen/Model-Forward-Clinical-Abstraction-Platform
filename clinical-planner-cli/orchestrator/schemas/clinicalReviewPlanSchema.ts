import { ClinicalTool } from '../../models/ResearchBundle';

export interface ClinicalReviewPlanResult {
  clinical_tools: ClinicalTool[];
  review_order: string[];
}

export const clinicalReviewPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['clinical_tools', 'review_order'],
  properties: {
    clinical_tools: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['tool_id', 'description'],
        properties: {
          tool_id: { type: 'string' },
          description: { type: 'string' },
          // Allow optional fields from ClinicalTool interface if needed for completeness
          tool_name: { type: 'string', nullable: true },
          version: { type: 'string', nullable: true },
          url: { type: 'string', nullable: true },
          pediatric_validated: { type: 'boolean', nullable: true },
          signals_generated: { 
            type: 'array', 
            items: { type: 'string' },
            nullable: true 
          }
        }
      }
    },
    review_order: {
      type: 'array',
      items: { type: 'string' }
    }
  }
} as const;
