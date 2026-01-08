import { z } from 'zod';

export const clinical_review_helper_Schema = z.object({
  review_helper: z.object({
  helper_notes: z.string(),
  suggested_actions: z.array(z.string())
})
});
export type clinical_review_helper_SchemaType = z.infer<typeof clinical_review_helper_Schema>;