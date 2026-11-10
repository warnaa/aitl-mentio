// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
import { MentorListFilter } from './MentorListFilter';

afterEach(() => { cleanup(); push.mockReset(); });
const options = [{ value: 'typescript', label: 'TypeScript' }, { value: 'ai-agents', label: 'AI agents' }];

it('marks the selected stack and moves between stacks through the URL', async () => {
  render(<MentorListFilter options={options} selected="ai-agents" resultCount={1} empty={<p>none</p>}><p>card</p></MentorListFilter>);
  expect(screen.getByRole('button', { name: 'AI agents' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('card')).toBeTruthy();
  expect(screen.queryByRole('searchbox')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'TypeScript' }));
  expect(push).toHaveBeenLastCalledWith('/mentors?tag=typescript');
  await userEvent.click(screen.getByRole('button', { name: 'All stacks' }));
  expect(push).toHaveBeenLastCalledWith('/mentors');
});

it('shows the empty state when nobody is listed', () => {
  render(<MentorListFilter options={options} selected={null} resultCount={0} empty={<p>none</p>}><p>card</p></MentorListFilter>);
  expect(screen.getByRole('button', { name: 'All stacks' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('none')).toBeTruthy();
  expect(screen.queryByText('card')).toBeNull();
});
