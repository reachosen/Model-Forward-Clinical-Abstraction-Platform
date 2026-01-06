import { z } from 'zod';

export const followup_questions_Schema = z.object({
  followup_questions: z.array(z.string())
});
export type followup_questions_SchemaType = z.infer<typeof followup_questions_Schema>;