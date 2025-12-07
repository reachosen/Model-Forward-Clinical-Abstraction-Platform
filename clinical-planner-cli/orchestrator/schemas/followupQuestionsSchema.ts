export interface FollowupQuestionsResult {
  followup_questions: string[];
}

export const followupQuestionsJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['followup_questions'],
  properties: {
    followup_questions: {
      type: 'array',
      items: { type: 'string' }
    }
  }
} as const;
