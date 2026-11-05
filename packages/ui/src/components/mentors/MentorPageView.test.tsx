// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MentorPageView } from './MentorPageView';
afterEach(cleanup);
it('renders only public work and description with technologies, never private or score fields', () => {
  const profile = {
    slug: 'ada',
    displayName: 'Ada',
    avatarUrl: null,
    publicWorkUrl: 'https://github.com/ada',
    bio: 'Builds reliable systems',
    stackTags: ['TypeScript'],
  };
  const { rerender } = render(<MentorPageView profile={profile} />);
  expect(screen.getByRole('heading', { name: 'Ada' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'See public work' }).getAttribute('href')).toBe(
    profile.publicWorkUrl,
  );
  expect(screen.getByText(profile.bio)).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/rating|score|review|ranking/i);
  rerender(<MentorPageView profile={{ ...profile, publicWorkUrl: null }} />);
  expect(screen.queryByRole('link')).toBeNull();
});
