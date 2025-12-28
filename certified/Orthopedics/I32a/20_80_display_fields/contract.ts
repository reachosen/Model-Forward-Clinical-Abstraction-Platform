import { z } from 'zod';

export const 20_80_display_fields_Schema = z.object({
  patient_summary: z.string(),
  provider_summary: z.string()
});
export type 20_80_display_fields_SchemaType = z.infer<typeof 20_80_display_fields_Schema>;