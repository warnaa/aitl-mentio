import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { admit, deny, GuardRedirect, guards } from '../../../test/page-guards';

vi.mock('../../../lib/session', async () => (await import('../../../test/page-guards')).guards);
const { default: Page, dynamic } = await import('./page');

const row = { bookingId: 'b1', startsAt: '2026-11-07T15:00:00Z', mentorName: 'Alex Mentor', menteeName: 'Sam Mentee', declineCount: 2 };
const declineReport = vi.fn();
const render = async () => renderToStaticMarkup(await Page() as ReactElement);

beforeEach(() => {
  vi.clearAllMocks();
  admit('operator');
  guards.withPageScope.mockImplementation(async (_path, fn) => fn({ sessionNoteService: { declineReport } } as never));
  declineReport.mockResolvedValue([row]);
});

it('is dynamic and guards itself as operator before reading', async () => {
  expect(dynamic).toBe('force-dynamic');
  await render();
  expect(guards.requirePageRole).toHaveBeenCalledExactlyOnceWith('operator', '/admin/sessions');
  expect(guards.requirePageRole.mock.invocationCallOrder[0]).toBeLessThan(declineReport.mock.invocationCallOrder[0]!);
});

it('shows the parties and the decline count', async () => {
  const html = await render();
  for (const text of ['Note declines', 'Alex Mentor', 'Sam Mentee', '>2<']) expect(html).toContain(text);
});

it('explains an empty report', async () => {
  declineReport.mockResolvedValue([]);
  expect(await render()).toContain('No declined notes');
});

it('reads nothing for a refused caller', async () => {
  deny('/mentor');
  await expect(Page()).rejects.toEqual(new GuardRedirect('/mentor'));
  expect(declineReport).not.toHaveBeenCalled();
});
