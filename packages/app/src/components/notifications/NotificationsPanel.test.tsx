// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiCall, useApiResource } from '@devmentor/ui/backend';
import { NotificationsPanel, type NotificationItem } from './NotificationsPanel';

const resource = vi.hoisted(() => ({ data: null as unknown, loading: false, error: null as string | null, reload: vi.fn() }));
vi.mock('@devmentor/ui/backend', async original => ({ ...await original<typeof import('@devmentor/ui/backend')>(), useApiResource: vi.fn(() => resource), apiCall: vi.fn() }));

const item = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n1', kind: 'booking_confirmed', audience: 'mentee', counterpartName: 'Alex Mentor',
  startsAt: '2026-11-12T14:00:00Z', lengthMinutes: 25, readAt: null, createdAt: '2026-11-06T12:00:00Z', sessionPath: '/sessions/b1', ...overrides,
});
beforeEach(() => { vi.clearAllMocks(); resource.data = { unreadCount: 0, items: [] }; resource.loading = false; resource.error = null; });
afterEach(cleanup);

it('reads the signed-in caller notifications and shows first use without inventing any', () => {
  render(<NotificationsPanel />);
  expect(useApiResource).toHaveBeenCalledWith('/api/notifications');
  expect(screen.getByText('No unread notifications.')).toBeTruthy();
  expect(screen.getByText('Nothing new')).toBeTruthy();
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Mark all as read' }).disabled).toBe(true);
});

it('shows loading and a readable error with recovery', () => {
  resource.data = null; resource.loading = true;
  const { rerender } = render(<NotificationsPanel />);
  expect(screen.getByRole('status')).toBeTruthy();
  resource.loading = false; resource.error = 'Cannot read notifications';
  rerender(<NotificationsPanel />);
  expect(screen.getByRole('alert').textContent).toContain('Cannot read notifications');
});

it('tells a mentee and a mentor about a confirmed booking with the counterpart, start and length', () => {
  resource.data = { unreadCount: 2, items: [item(), item({ id: 'n2', audience: 'mentor', counterpartName: 'Sam Mentee', lengthMinutes: 50, readAt: '2026-11-06T13:00:00Z' })] };
  render(<NotificationsPanel />);
  expect(screen.getByText('You have 2 unread notifications.')).toBeTruthy();
  expect(screen.getByText(/Your session with Alex Mentor is confirmed\./)).toBeTruthy();
  expect(screen.getByText(/Sam Mentee booked a session with you\./)).toBeTruthy();
  expect(screen.getByText(/25 minutes\./)).toBeTruthy();
  expect(screen.getByText(/50 minutes\./)).toBeTruthy();
  expect(screen.getAllByText('New:')).toHaveLength(1);
});

it('tells the mentee the written answer arrived and links to the session', () => {
  resource.data = { unreadCount: 1, items: [item({ kind: 'answer_posted' })] };
  render(<NotificationsPanel />);
  expect(screen.getByText(/Alex Mentor posted the written answer for your session on/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Read the written answer' }).getAttribute('href')).toBe('/sessions/b1');
  expect(screen.getByText('New:')).toBeTruthy();
  expect(screen.queryByText(/is confirmed/)).toBeNull();
});

it('uses the singular for exactly one unread notification', () => {
  resource.data = { unreadCount: 1, items: [item()] };
  render(<NotificationsPanel />);
  expect(screen.getByText('You have 1 unread notification.')).toBeTruthy();
});

it('marks only the listed unread ids read, then reloads', async () => {
  resource.data = { unreadCount: 1, items: [item(), item({ id: 'n2', readAt: '2026-11-06T13:00:00Z' })] };
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { updated: 1 } });
  render(<NotificationsPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
  await waitFor(() => expect(resource.reload).toHaveBeenCalledOnce());
  expect(apiCall).toHaveBeenCalledWith('/api/notifications', { method: 'POST', body: { ids: ['n1'] } });
});

it('keeps the notifications visible and explains a rejected or failed request', async () => {
  resource.data = { unreadCount: 1, items: [item()] };
  vi.mocked(apiCall).mockResolvedValueOnce({ ok: false, error: { code: 'forbidden', message: 'Not allowed' } } as never);
  render(<NotificationsPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Not allowed'));
  vi.mocked(apiCall).mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('could not be marked as read'));
  expect(resource.reload).not.toHaveBeenCalled();
  expect(screen.getByText(/Your session with Alex Mentor/)).toBeTruthy();
});

it.each([null, '2026-11-07T15:00:00Z'])('links a private note without any body excerpt and preserves read status %s', readAt => {
  resource.data = { unreadCount: readAt ? 0 : 1, items: [item({ kind: 'note_awaiting_approval', readAt })] };
  render(<NotificationsPanel />);
  expect(screen.getByText(/Alex Mentor sent a private session note for your approval/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Read the private session note' }).getAttribute('href')).toBe('/sessions/b1');
  expect(screen.queryByText('New:') !== null).toBe(readAt === null);
});
