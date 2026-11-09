import { apiHandler, mentorListQuerySchema, parseWith, withRequestScope } from '@devmentor/core';

export const dynamic = 'force-dynamic';

/** `GET /api/mentors[?tag=]`: the public mentor list (R13). Only `tag` is read; an unknown tag is 422 (B18). */
export const GET = apiHandler(async req => {
  const tag = new URL(req.url).searchParams.get('tag') ?? undefined;
  const query = parseWith(mentorListQuerySchema, { tag });
  return withRequestScope(req, async ({ mentorProfileService }) => ({ mentors: await mentorProfileService.listPublished(query.tag) }));
});
