import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { withScope } from '@devmentor/core';
import { EmptyState, ErrorMessage } from '@devmentor/ui/backend';
import { MentorCard } from '@devmentor/ui/components/mentors/MentorCard';
import { PublicPage } from '../../components/public/PublicPage';
import { findAllByType, findByType } from '../../test/element-tree';
import Page, { dynamic } from './page';
import { MentorListFilter } from './MentorListFilter';
vi.mock('@devmentor/core', async (original) => ({
  ...(await original<typeof import('@devmentor/core')>()),
  withScope: vi.fn(),
}));

const mentor = {
  slug: 'ada', displayName: 'Ada', avatarUrl: null, publicWorkUrl: 'https://github.com/ada', bio: 'Builds systems', stackTags: ['react', 'ai-agents'],
  prices: { price25Cents: 8000, price50Cents: 16000, currency: 'PLN' }, nextSlotStartsAt: '2026-11-12T09:00:00.000Z',
};
const listPublished = vi.fn();
beforeEach(() => {
  listPublished.mockReset().mockResolvedValue([mentor]);
  vi.mocked(withScope).mockReset().mockImplementation(async cb => cb({ mentorProfileService: { listPublished } } as never));
});
const render = async (tag?: string | string[]) => (await Page({ searchParams: Promise.resolve(tag === undefined ? {} : { tag }) })) as ReactElement;

it('renders every listed mentor as a card linking to the mentor page, with all four stacks to filter by', async () => {
  expect(dynamic).toBe('force-dynamic');
  const tree = await render();
  expect(tree.type).toBe(PublicPage);
  expect(listPublished).toHaveBeenCalledWith(undefined);
  const filter = findByType(tree, MentorListFilter).props;
  expect(filter).toMatchObject({ selected: null, resultCount: 1, options: [{ value: 'typescript', label: 'TypeScript' }, { value: 'react', label: 'React' }, { value: 'python', label: 'Python' }, { value: 'ai-agents', label: 'AI agents' }] });
  expect((filter.empty as ReactElement<{ title: string }>).props.title).toBe('No mentors have open times right now');
  expect(findByType(tree, MentorCard).props).toEqual({
    name: 'Ada', introduction: 'Builds systems', stacks: ['React', 'AI agents'], publicWorkUrl: 'https://github.com/ada',
    prices: mentor.prices, nextSlotStartsAt: mentor.nextSlotStartsAt, href: '/m/ada',
  });
});

it('narrows the list to one known stack and names it when nobody is listed', async () => {
  listPublished.mockResolvedValue([]);
  const tree = await render('python');
  expect(listPublished).toHaveBeenCalledWith('python');
  const filter = findByType(tree, MentorListFilter).props;
  expect(filter).toMatchObject({ selected: 'python', resultCount: 0 });
  expect((filter.empty as ReactElement<{ title: string }>).props.title).toBe('No Python mentors have open times right now');
  expect(findAllByType(tree, MentorCard)).toHaveLength(0);
});

it('explains an unknown or repeated stack instead of listing anyone', async () => {
  for (const tag of ['rust', ['react', 'python']]) {
    const filter = findByType(await render(tag), MentorListFilter).props;
    expect(filter).toMatchObject({ selected: null, resultCount: 0 });
    const empty = filter.empty as ReactElement<{ title: string; tone: string }>;
    expect(empty.type).toBe(EmptyState);
    expect(empty.props).toMatchObject({ tone: 'warning', title: 'We do not list that stack' });
  }
  expect(listPublished).not.toHaveBeenCalled();
});

it('shows a recoverable error when the list cannot be loaded', async () => {
  listPublished.mockRejectedValue(new Error('db down'));
  const tree = await render();
  expect(tree.type).toBe(PublicPage);
  expect(findByType(tree, ErrorMessage).props.message).toBe('The mentor list is unavailable. Please try again later.');
});
