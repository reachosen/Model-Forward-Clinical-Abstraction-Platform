export interface ClinicalReviewHelperResult {
  review_helper: {
    helper_notes: string;
    suggested_actions: string[];
  };
}

export const clinicalReviewHelperJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['review_helper'],
  properties: {
    review_helper: {
      type: 'object',
      required: ['helper_notes', 'suggested_actions'],
      properties: {
        helper_notes: { type: 'string' },
        suggested_actions: { 
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  }
} as const;
