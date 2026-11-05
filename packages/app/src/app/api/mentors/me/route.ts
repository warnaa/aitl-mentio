import { makeOwnedResourceRoute } from '@devmentor/core';
import { mentorProfileUpdateSchema } from '@devmentor/core/validators/mentors/mentor-profile-update.schema';
export const dynamic = 'force-dynamic';
export const { GET, PUT } = makeOwnedResourceRoute({
  role: 'mentor',
  updateSchema: mentorProfileUpdateSchema,
  read: ({ mentorProfileService }) => mentorProfileService.getMine(),
  update: ({ mentorProfileService }, input) => mentorProfileService.update(input),
});
