// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { apiCall } from '@devmentor/ui/backend';
import { PlatformSettingsForm, type SettingsSnapshot } from './PlatformSettingsForm';
vi.mock('../../../../../ui/src/backend/api/apiCall', () => ({ apiCall: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const defaults: SettingsSnapshot = {
  settings: { currency: 'PLN', priceBounds: { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } }, feePercent: 20, version: 0, updatedAt: null, updatedBy: null },
  outOfBounds: { total: 0, mentors: [] },
};
const field = (label: RegExp) => screen.getByLabelText<HTMLInputElement>(label);
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

it('prefills the current bounds and fee, and says when nobody has changed them', () => {
  render(<PlatformSettingsForm initial={defaults} />);
  expect(field(/25-minute minimum/).value).toBe('80.00');
  expect(field(/25-minute maximum/).value).toBe('600.00');
  expect(field(/50-minute minimum/).value).toBe('160.00');
  expect(field(/50-minute maximum/).value).toBe('1200.00');
  expect(field(/Platform fee/).value).toBe('20');
  expect(screen.getByText('Using the default values. Nobody has changed them here yet.')).toBeTruthy();
  expect(screen.getByText("Every mentor's prices are within the bounds")).toBeTruthy();
  expect(screen.queryByRole('combobox')).toBeNull();
});

it('refuses a minimum above its maximum or a fee above 100 before sending anything', async () => {
  render(<PlatformSettingsForm initial={defaults} />);
  fireEvent.change(field(/25-minute minimum/), { target: { value: '700' } });
  fireEvent.change(field(/Platform fee/), { target: { value: '101' } });
  save();
  await screen.findByText('The maximum must be at least the minimum (PLN 700.00).');
  expect(screen.getByText('Enter a whole percent from 0 to 100.')).toBeTruthy();
  expect(apiCall).not.toHaveBeenCalled();
});

it('sends the loaded version, then shows the saved state and the newly flagged mentors', async () => {
  render(<PlatformSettingsForm initial={{ ...defaults, settings: { ...defaults.settings, version: 4 } }} />);
  fireEvent.change(field(/25-minute minimum/), { target: { value: '100' } });
  fireEvent.change(field(/Platform fee/), { target: { value: '15' } });
  vi.mocked(apiCall).mockResolvedValueOnce({ ok: true, data: {
    settings: { ...defaults.settings, priceBounds: { ...defaults.settings.priceBounds, p25: { minCents: 10000, maxCents: 60000 } }, feePercent: 15, version: 5, updatedAt: '2026-11-09T12:00:00.000Z', updatedBy: { displayName: 'Founder A' } },
    outOfBounds: { total: 1, mentors: [{ mentorProfileId: 'p', displayName: 'Ada Lovelace', price25Cents: 9000, price50Cents: null, breaches: ['price25'] }] },
  } });
  save();
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('The settings were saved.'));
  expect(apiCall).toHaveBeenCalledWith('/api/operator/settings', { method: 'PUT', body: { price25Min: '100', price25Max: '600.00', price50Min: '160.00', price50Max: '1200.00', feePercent: 15, version: 4 } });
  const row = screen.getByRole('row', { name: /Ada Lovelace/ });
  expect(within(row).getByText('PLN 90.00')).toBeTruthy();
  expect(within(row).getByText('Not set')).toBeTruthy();
  expect(within(row).getByText('25-minute price')).toBeTruthy();
  expect(screen.getByText(/Last changed by Founder A on/)).toBeTruthy();
  // The next save carries the new version.
  vi.mocked(apiCall).mockResolvedValueOnce({ ok: false, error: { code: 'conflict', message: 'Settings changed since you opened them. Reload to see the current values.' } });
  save();
  await screen.findByText('Settings changed since you opened them. Reload to see the current values.');
  expect(screen.queryByRole('status')).toBeNull();
  expect(vi.mocked(apiCall).mock.calls[1]![1]).toMatchObject({ body: { version: 5 } });
  expect(field(/Platform fee/).value).toBe('15');
});

it('says when only part of a long flagged list is shown', () => {
  const mentors = [{ mentorProfileId: 'p', displayName: 'Ada', price25Cents: 1, price50Cents: 1, breaches: ['price25', 'price50'] as ('price25' | 'price50')[] }];
  render(<PlatformSettingsForm initial={{ ...defaults, outOfBounds: { total: 250, mentors } }} />);
  expect(screen.getByText('Showing 1 of 250 mentors.')).toBeTruthy();
  expect(screen.getByText('25-minute price, 50-minute price')).toBeTruthy();
});
