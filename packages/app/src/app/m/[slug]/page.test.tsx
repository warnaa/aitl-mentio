import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { NotFoundError, withScope } from '@devmentor/core';
import { ErrorMessage } from '@devmentor/ui/backend';
import { MentorPageView } from '@devmentor/ui/components/mentors/MentorPageView';
import { notFound } from 'next/navigation';
import { PublicPage } from '../../../components/public/PublicPage';
import { findByType } from '../../../test/element-tree';
import Page, { dynamic } from './page';
import { getPageSession } from '../../../lib/session';
import { SlotPicker } from './SlotPicker';
vi.mock('../../../lib/session', () => ({ getPageSession: vi.fn() }));
beforeEach(() => vi.mocked(getPageSession).mockResolvedValue(null));
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

const offer = { displayName: 'Ada', slug: 'ada', avatarUrl: null, publicWorkUrl: null, bio: 'Mentor', stackTags: [],
  offerReady: true, prices: { price25Cents: 8000, price50Cents: 16000, currency: 'PLN' },
  slots: [{ id: 'slot', startsAt: '2099-01-01T15:00:00Z', meetsLeadTime: true, viableLengths: [25, 50] }] };
function mockOffer(profile = offer) {
  vi.mocked(withScope).mockImplementation(async cb => cb({ mentorProfileService: { getPublicBySlug: vi.fn().mockResolvedValue(profile) } } as never));
}
it('adds booking controls with safe selection and the current viewer role', async () => {
  mockOffer();
  for (const [session, viewer] of [[null, 'signed-out'], [{ userId: 'mentee', roles: ['mentee'] }, 'mentee'], [{ userId: 'mentor', roles: ['mentor'] }, 'other']] as const) {
    vi.mocked(getPageSession).mockResolvedValue(session as Awaited<ReturnType<typeof getPageSession>>);
    const tree = await Page({ params: Promise.resolve({ slug: 'ada' }), searchParams: Promise.resolve({ slot: 'slot', length: '50' }) });
    expect(findByType(tree, SlotPicker).props).toEqual({ slug: 'ada', slots: offer.slots, prices: offer.prices, viewer, initialSlotId: 'slot', initialLength: 50 });
  }
});
it('rejects duplicate query values and defaults invalid length to 25 without an automatic reservation', async () => {
  mockOffer();
  const tree = await Page({ params: Promise.resolve({ slug: 'ada' }), searchParams: Promise.resolve({ slot: ['slot', 'other'], length: ['50', '25'] }) });
  expect(findByType(tree, SlotPicker).props).toMatchObject({ initialSlotId: '', initialLength: 25 });
  const noQuery = await render('ada');
  expect(findByType(noQuery, SlotPicker).props).toMatchObject({ initialSlotId: '', initialLength: 25 });
});
it('omits controls when an otherwise ready offer has no prices and fails closed on session infrastructure errors', async () => {
  mockOffer({ ...offer, prices: null } as unknown as typeof offer);
  expect(findByType(await render('ada'), MentorPageView).props.booking).toBeNull();
  mockOffer();
  vi.mocked(getPageSession).mockRejectedValueOnce(new Error('session database down'));
  expect(findByType(await render('ada'), ErrorMessage).props.message).toContain('unavailable');
});
