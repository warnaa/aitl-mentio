import { z } from 'zod';
import { StackTags } from '../../domain/vocabularies/stack-tags';

/**
 * The mentor list's only parameter (R13): one optional stack tag. There is deliberately no
 * free-text field, and an unknown tag is a 422 rather than an empty list (B18).
 */
export const mentorListQuerySchema = z.object({ tag: StackTags.schema.optional() }).strict();
export type MentorListQuery = z.infer<typeof mentorListQuerySchema>;
