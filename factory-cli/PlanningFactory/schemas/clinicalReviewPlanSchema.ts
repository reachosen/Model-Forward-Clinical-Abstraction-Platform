export interface ClinicalReviewPlanResult {
  clinical_reviewer: {
    metric_alignment: string;
    key_factors: string[];
    concerns_or_flags: string[];
    overall_call: 'clear_pass' | 'clear_fail' | 'needs_clinical_review';
  };
}

export const clinicalReviewPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['clinical_reviewer'],
  properties: {
    clinical_reviewer: {
      type: 'object',
      required: ['metric_alignment', 'key_factors', 'concerns_or_flags', 'overall_call'],
      properties: {
        metric_alignment: { type: 'string' },
        key_factors: { type: 'array', items: { type: 'string' } },
        concerns_or_flags: { type: 'array', items: { type: 'string' } },
        overall_call: {
          type: 'string',
          enum: ['clear_pass', 'clear_fail', 'needs_clinical_review']
        }
      }
    }
  }
} as const;