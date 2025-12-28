export interface ExclusionCheckResult {
  exclusion_check: {
    overall_status: 'excluded' | 'not_excluded' | 'needs_review';
    exclusions_evaluated: Array<{
      exclusion_id: string;
      status: 'met' | 'not_met' | 'unclear';
      evidence: string | null;
      notes?: string;
    }>;
    exceptions_evaluated: Array<{
      exception_id: string;
      applies: boolean | 'unclear';
      adjustment_applied: string | null;
      evidence: string | null;
    }>;
    final_exclusion_reason: string | null;
  };
}

export const exclusionCheckJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['exclusion_check'],
  properties: {
    exclusion_check: {
      type: 'object',
      required: ['overall_status', 'exclusions_evaluated', 'exceptions_evaluated', 'final_exclusion_reason'],
      properties: {
        overall_status: { 
          type: 'string', 
          enum: ['excluded', 'not_excluded', 'needs_review'] 
        },
        exclusions_evaluated: {
          type: 'array',
          items: {
            type: 'object',
            required: ['exclusion_id', 'status', 'evidence'],
            properties: {
              exclusion_id: { type: 'string' },
              status: { type: 'string', enum: ['met', 'not_met', 'unclear'] },
              evidence: { type: ['string', 'null'] },
              notes: { type: 'string' }
            }
          }
        },
        exceptions_evaluated: {
          type: 'array',
          items: {
            type: 'object',
            required: ['exception_id', 'applies', 'adjustment_applied', 'evidence'],
            properties: {
              exception_id: { type: 'string' },
              applies: { type: ['boolean', 'string'] }, // 'unclear' is a string
              adjustment_applied: { type: ['string', 'null'] },
              evidence: { type: ['string', 'null'] }
            }
          }
        },
        final_exclusion_reason: { type: ['string', 'null'] }
      }
    }
  }
} as const;
