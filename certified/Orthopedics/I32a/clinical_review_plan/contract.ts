import { z } from 'zod';

export const clinical_review_plan_Schema = z.object({
  clinical_reviewer: z.object({
  metric_alignment: z.string(),
  key_factors: z.array(z.string()),
  concerns_or_flags: z.array(z.string()),
  overall_call: z.enum(['clear_pass', 'clear_fail', 'needs_clinical_review'])
})
});
export type clinical_review_plan_SchemaType = z.infer<typeof clinical_review_plan_Schema>;