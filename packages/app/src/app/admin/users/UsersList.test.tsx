// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResult } from '@devmentor/ui/backend';
import { UsersList, type UserRow } from './UsersList';

/* The real `DataTable` and `apiCall` run; only `fetch` is stubbed. */
const fetchMock = vi.fn<typeof fetch>();

function envelope(body: ApiResult<UserRow[]>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const ada: UserRow = {
  id: 'u-1',
  email: 'mock-mentor@devmentor.test',
  displayName: 'Ada Lovelace',
  roles: ['mentee', 'mentor'],
};
const grace: UserRow = { id: 'u-2', email: 'mock-mentee@devmentor.test', displayName: 'Grace Hopper', roles: ['mentee'] };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('UsersList', () => {
  it('fetches /api/users through apiCall and lists each user with their roles as chips (s25)', async () => {
    fetchMock.mockResolvedValue(envelope({ ok: true, data: [ada, grace] }));
    render(<UsersList />);

    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeTruthy();
    expect(await screen.findByRole('cell', { name: 'Ada Lovelace' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Name', 'Email', 'Roles']);
    expect(screen.getByRole('list', { name: 'Roles of Ada Lovelace' }).textContent).toBe('MenteeMentor');
    expect(screen.getByRole('cell', { name: 'Grace Hopper' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Roles of Grace Hopper' }).textContent).toBe('Mentee');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/users');
  });

  it('shows the envelope error when the list is refused', async () => {
    fetchMock.mockResolvedValue(envelope({ ok: false, error: { code: 'forbidden', message: 'Operators only' } }, 403));
    render(<UsersList />);

    expect((await screen.findByRole('alert')).textContent).toContain('Operators only');
  });

  it('ignores a response that arrives after it unmounted', async () => {
    let respond!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => { respond = resolve; }));
    const { unmount } = render(<UsersList />);

    unmount();
    await act(async () => respond(envelope({ ok: true, data: [ada] })));

    expect(screen.queryByRole('cell', { name: 'Ada Lovelace' })).toBeNull();
  });
});
