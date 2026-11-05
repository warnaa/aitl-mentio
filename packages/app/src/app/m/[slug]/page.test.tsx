import { expect, it, vi } from 'vitest';
import { NotFoundError, withScope } from '@devmentor/core';
import { notFound } from 'next/navigation';
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
it('reads the signed-out public projection', async () => {
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
  expect((await Page({ params: Promise.resolve({ slug: 'ada' }) })).props.profile).toEqual({
    ...profile,
    stackTags: ['React', 'AI agents'],
  });
});
it('404s unpublished pages and renders infrastructure failure', async () => {
  vi.mocked(withScope).mockRejectedValueOnce(new NotFoundError()).mockRejectedValueOnce(new Error('down'));
  await expect(Page({ params: Promise.resolve({ slug: 'hidden' }) })).rejects.toThrow('404');
  expect(notFound).toHaveBeenCalledOnce();
  expect((await Page({ params: Promise.resolve({ slug: 'ada' }) })).props.children.props.message).toContain(
    'unavailable',
  );
});
