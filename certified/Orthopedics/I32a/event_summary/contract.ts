import { z } from 'zod';

export const event_summary_Schema = z.object({
  event_summary: z.string(),
  timeline_complete: z.boolean(),
  key_timestamps: z.array(z.string())
});
export type event_summary_SchemaType = z.infer<typeof event_summary_Schema>;