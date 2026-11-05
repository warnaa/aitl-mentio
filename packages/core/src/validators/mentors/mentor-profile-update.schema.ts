import { z } from 'zod';
import { StackTags } from '../../domain/vocabularies/stack-tags';

export const mentorProfileUpdateSchema = z.object({
  publicWorkUrl: z.url({ protocol: /^https?$/ }).max(2048).optional(),
  bio: z.string().trim().min(1).max(2000).optional(),
  stackTags: z.array(StackTags.schema).max(4).optional(),
});
export type MentorProfileUpdate = z.infer<typeof mentorProfileUpdateSchema>;
