import { z } from 'zod';

export const exclusion_check_Schema = z.object({
  exclusion_check: z.object({
  overall_status: z.enum(['excluded', 'not_excluded', 'needs_review']),
  exclusions_evaluated: z.array(z.object({
  exclusion_id: z.string(),
  status: z.enum(['met', 'not_met', 'unclear']),
  evidence: z.unknown(),
  notes: z.string().optional()
})),
  exceptions_evaluated: z.array(z.object({
  exception_id: z.string(),
  applies: z.string(),
  adjustment_applied: z.unknown().optional(),
  evidence: z.unknown()
})),
  final_exclusion_reason: z.unknown()
})
});
export type exclusion_check_SchemaType = z.infer<typeof exclusion_check_Schema>;