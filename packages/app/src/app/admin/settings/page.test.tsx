import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { admit, deny, GuardRedirect, guards } from '../../../test/page-guards';

vi.mock('../../../lib/session', async () => (await import('../../../test/page-guards')).guards);
const { default: Page, dynamic } = await import('./page');

const settings = { currency: 'PLN', priceBounds: { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } }, feePercent: 20, version: 0, updatedAt: null, updatedBy: null };
const getForOperator = vi.fn();
const listOutOfBounds = vi.fn();
const render = async () => renderToStaticMarkup(await Page() as ReactElement);

beforeEach(() => {
  vi.clearAllMocks();
  admit('operator');
  guards.withPageScope.mockImplementation(async (_path, fn) => fn({ platformSettingsService: { getForOperator }, mentorProfileService: { listOutOfBounds } } as never));
  getForOperator.mockResolvedValue(settings);
  listOutOfBounds.mockResolvedValue({ total: 1, mentors: [{ mentorProfileId: 'p', displayName: 'Ada Lovelace', price25Cents: 7000, price50Cents: 16000, breaches: ['price25'] }] });
});

it('is dynamic and guards itself as operator before reading', async () => {
  expect(dynamic).toBe('force-dynamic');
  await render();
  expect(guards.requirePageRole).toHaveBeenCalledExactlyOnceWith('operator', '/admin/settings');
  expect(guards.requirePageRole.mock.invocationCallOrder[0]).toBeLessThan(getForOperator.mock.invocationCallOrder[0]!);
});

it('shows the form and lists flagged mentors against the current bounds', async () => {
  const html = await render();
  expect(listOutOfBounds).toHaveBeenCalledWith(settings);
  for (const text of ['Platform settings', 'Bounds and fee', 'Prices outside the bounds', 'Ada Lovelace', 'PLN 70.00', 'These prices are not changed.']) expect(html).toContain(text);
});

it('reads nothing for a refused caller', async () => {
  deny('/mentor');
  await expect(Page()).rejects.toEqual(new GuardRedirect('/mentor'));
  expect(getForOperator).not.toHaveBeenCalled();
});
