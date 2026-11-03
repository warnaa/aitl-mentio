// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResult } from '@devmentor/ui/backend';
import { navigation } from '../../lib/navigation';
import { SIGNED_OUT_PATH, SignOutButton } from './SignOutButton';

/*
 * The real `WorkflowAction` and `apiCall` run; only `fetch` (what `apiCall` calls) and
 * the hard-navigation seam are stubbed.
 */
const fetchMock = vi.fn<typeof fetch>();

function envelope(body: ApiResult<null>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

let assign: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  assign = vi.spyOn(navigation, 'assign').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SignOutButton', () => {
  it('POSTs /api/auth/logout with the CSRF header, shows the pending state, then hard-navigates to /', async () => {
    let respond!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => { respond = resolve; }));
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    const pending = await screen.findByRole('button', { name: 'Signing out…' });
    expect(pending.hasAttribute('disabled')).toBe(true);
    expect(assign).not.toHaveBeenCalled();
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe('/api/auth/logout');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['x-devmentor-request']).toBe('1');

    await act(async () => respond(envelope({ ok: true, data: null })));
    expect(assign).toHaveBeenCalledExactlyOnceWith(SIGNED_OUT_PATH);
    expect(SIGNED_OUT_PATH).toBe('/');
  });

  it('shows the envelope error and stays on the page when sign-out is refused', async () => {
    fetchMock.mockResolvedValue(
      envelope({ ok: false, error: { code: 'forbidden', message: 'Missing or invalid request header' } }, 403),
    );
    render(<SignOutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Missing or invalid request header');
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sign out' }).hasAttribute('disabled')).toBe(false);
  });
});
