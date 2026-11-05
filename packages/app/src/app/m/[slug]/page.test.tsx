import { expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { NotFoundError, withScope } from '@devmentor/core';
import { ErrorMessage } from '@devmentor/ui/backend';
import { MentorPageView } from '@devmentor/ui/components/mentors/MentorPageView';
import { notFound } from 'next/navigation';
import { PublicPage } from '../../../components/public/PublicPage';
import { findByType } from '../../../test/element-tree';
import Page, { dynamic } from './page';
vi.mock('@devmentor/core', async (original) => ({
  ...(await original<typeof import('@devmentor/core')>()),
  withScope: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('404');
  }),
}));
const render = async (slug: string) => (await Page({ params: Promise.resolve({ slug }) })) as ReactElement;

it('renders the signed-out public projection inside the public frame', async () => {
  const profile = {
    displayName: 'Ada',
    slug: 'ada',
    avatarUrl: null,
    publicWorkUrl: 'https://github.com/ada',
    bio: 'Builds systems',
    stackTags: ['react', 'ai-agents'],
  };
  vi.mocked(withScope).mockImplementation(async (cb) =>
    cb({ mentorProfileService: { getPublicBySlug: vi.fn().mockResolvedValue(profile) } } as never),
  );
  expect(dynamic).toBe('force-dynamic');
  const tree = await render('ada');
  expect(tree.type).toBe(PublicPage);
  expect(findByType(tree, MentorPageView).props.profile).toEqual({ ...profile, stackTags: ['React', 'AI agents'] });
});

it('404s unpublished pages and renders infrastructure failure in the public frame', async () => {
  vi.mocked(withScope).mockRejectedValueOnce(new NotFoundError()).mockRejectedValueOnce(new Error('down'));
  await expect(render('hidden')).rejects.toThrow('404');
  expect(notFound).toHaveBeenCalledOnce();
  const tree = await render('ada');
  expect(tree.type).toBe(PublicPage);
  expect(findByType(tree, ErrorMessage).props.message).toContain('unavailable');
});
