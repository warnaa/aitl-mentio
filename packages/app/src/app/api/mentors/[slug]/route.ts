import { apiHandler, withRequestScope } from '@devmentor/core';
export const dynamic = 'force-dynamic';
export const GET = apiHandler(async (req, { params }) => {
  const { slug } = await params;
  return withRequestScope(req, ({ mentorProfileService }) =>
    mentorProfileService.getPublicBySlug(String(slug)),
  );
});
