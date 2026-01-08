import { z } from 'zod';

export const signal_enrichment_Schema = z.object({
  signal_groups: z.array(z.object({
  group_id: z.string(),
  signals: z.array(z.object({
  signal_id: z.string(),
  description: z.string(),
  evidence_type: z.enum(['verbatim_text', 'structured_field']).optional(),
  provenance: z.string(),
  tags: z.array(z.string()).optional()
}))
}))
});
export type signal_enrichment_SchemaType = z.infer<typeof signal_enrichment_Schema>;