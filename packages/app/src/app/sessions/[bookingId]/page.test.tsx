import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { NotFoundError } from '@devmentor/core';
import { ErrorMessage } from '@devmentor/ui/backend';
import { notFound } from 'next/navigation';
import { admit, deny, GuardRedirect, guards } from '../../../test/page-guards';
import { SessionIsTextNotice, ShareRuleNotice } from '@devmentor/ui';
import { findByType } from '../../../test/element-tree';
import { SessionRoom } from './SessionRoom';

const scope = vi.hoisted(() => ({ withPageScope: vi.fn(), getForParticipant: vi.fn(), getNote: vi.fn() }));
vi.mock('../../../lib/session', async () => ({ requirePageSignedIn: (await import('../../../test/page-guards')).guards.requirePageSignedIn, withPageScope: scope.withPageScope }));
vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('404'); }) }));

const { default: SessionPage, dynamic } = await import('./page');

const id = '11111111-1111-4111-8111-111111111111';
const initial = { booking: { id }, window: 'open', messages: [] };
const render = (bookingId = id) => SessionPage({ params: Promise.resolve({ bookingId }) }) as Promise<ReactElement>;

beforeEach(() => {
  vi.clearAllMocks();
  admit('mentee');
  scope.getForParticipant.mockResolvedValue(initial);
  scope.getNote.mockResolvedValue({ current: null, history: [] });
  scope.withPageScope.mockImplementation(async (_path: string, fn: (cradle: unknown) => unknown) => fn({ textSessionService: { getForParticipant: scope.getForParticipant }, sessionNoteService: { getForParticipant: scope.getNote } }));
});

describe('/sessions/[bookingId]', () => {
  it('is dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('guards itself, returning to the same session, and renders the room with the server view', async () => {
    const tree = await render();
    expect(guards.requirePageSignedIn).toHaveBeenCalledExactlyOnceWith(`/sessions/${id}`);
    expect(scope.withPageScope.mock.calls[0]![0]).toBe(`/sessions/${id}`);
    expect(scope.getForParticipant).toHaveBeenCalledWith(id);
    expect(tree.type).toBe(SessionRoom);
    expect(tree.props).toEqual({ initial, initialNote: { current: null, history: [] } });
    expect(scope.getForParticipant.mock.invocationCallOrder[0]).toBeLessThan(scope.getNote.mock.invocationCallOrder[0]!);
  });

  it('answers not-found to an address that is not a uuid, before any guard or lookup', async () => {
    await expect(render('not-a-booking')).rejects.toThrow('404');
    expect(notFound).toHaveBeenCalledOnce();
    expect(guards.requirePageSignedIn).not.toHaveBeenCalled();
    expect(scope.withPageScope).not.toHaveBeenCalled();
  });

  it('answers the standard not-found to a stranger, an unknown booking or an unconfirmed one', async () => {
    scope.getForParticipant.mockRejectedValue(new NotFoundError('Session not found'));
    await expect(render()).rejects.toThrow('404');
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('renders a readable error, not a stack trace, when the session cannot be read', async () => {
    scope.getForParticipant.mockRejectedValue(new Error('database down'));
    const tree = await render();
    expect(String((findByType(tree, ErrorMessage).props as { message: string }).message)).toContain('unavailable');
    expect(findByType(tree, SessionIsTextNotice)).toBeTruthy();
    expect(findByType(tree, ShareRuleNotice)).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('redirects a signed-out visitor to sign-in before reading anything', async () => {
    deny(`/sign-in?returnTo=%2Fsessions%2F${id}`);
    await expect(render()).rejects.toEqual(new GuardRedirect(`/sign-in?returnTo=%2Fsessions%2F${id}`));
    expect(scope.withPageScope).not.toHaveBeenCalled();
  });
});
