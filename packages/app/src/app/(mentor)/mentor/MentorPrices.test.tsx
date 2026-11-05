// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { apiCall } from '@devmentor/ui/backend';
import { MentorPrices } from './MentorPrices';
vi.mock('../../../../../ui/src/backend/api/apiCall', () => ({ apiCall: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const priceBounds = { p25: { minCents: 8000, maxCents: 60000 }, p50: { minCents: 16000, maxCents: 120000 } };

it('shows server bounds as chips, preserves raw money on failure and saves both together', async () => {
  const onSaved = vi.fn();
  render(<MentorPrices profile={{ prices: null, priceBounds }} onSaved={onSaved} />);
  const p25 = screen.getByLabelText<HTMLInputElement>(/25-minute price/);
  const p50 = screen.getByLabelText<HTMLInputElement>(/50-minute price/);
  expect(p25.type).toBe('text'); expect(p25.inputMode).toBe('decimal');
  expect(screen.getByText('25 min: PLN 80–600')).toBeTruthy();
  expect(screen.getByText('50 min: PLN 160–1,200')).toBeTruthy();
  fireEvent.change(p25, { target: { value: '80.00' } }); fireEvent.change(p50, { target: { value: '160' } });
  vi.mocked(apiCall).mockResolvedValueOnce({ ok: false, error: { code: 'validation_failed', message: 'Out of bounds', fieldErrors: { price50: ['Use the current bounds.'] } } });
  fireEvent.click(screen.getByRole('button', { name: 'Save prices' }));
  await screen.findByText('Use the current bounds.'); expect(p25.value).toBe('80.00');
  expect(onSaved).not.toHaveBeenCalled();
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: {} });
  fireEvent.click(screen.getByRole('button', { name: 'Save prices' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Both session prices were saved.'));
  expect(apiCall).toHaveBeenCalledWith('/api/mentors/me/prices', { method: 'PUT', body: { price25: '80.00', price50: '160' } });
  expect(onSaved).toHaveBeenCalledOnce();
});

it('prefills persisted minor-unit prices without a selectable currency', () => {
  render(<MentorPrices profile={{ prices: { price25Cents: 12345, price50Cents: 23456, currency: 'PLN' }, priceBounds }} onSaved={vi.fn()} />);
  expect(screen.getByLabelText<HTMLInputElement>(/25-minute price/).value).toBe('123.45');
  expect(screen.getByLabelText<HTMLInputElement>(/50-minute price/).value).toBe('234.56');
  expect(screen.queryByRole('combobox')).toBeNull();
});
