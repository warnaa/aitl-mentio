// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { apiCall } from '@devmentor/ui/backend';
import { MentorOfferStatus } from './MentorOfferStatus';
vi.mock('../../../../../ui/src/backend/api/apiCall', () => ({ apiCall: vi.fn() }));
afterEach(cleanup);
it('links unmet server requirements to their corrective screens', async () => {
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { offerReadiness: { ready: false, items: ['profile', 'published', 'price25', 'price50', 'availability'].map(key => ({ key, label: key, met: false })) } } });
  render(<MentorOfferStatus />); await screen.findByText('Prepare your mentor offer');
  expect(screen.getByRole('link', { name: 'Publish a time' }).getAttribute('href')).toBe('/mentor/slots');
  expect(screen.getAllByRole('link', { name: 'Set prices' })).toHaveLength(2);
});
it('shows readiness without implying a checkout/payment launch', async () => {
  vi.mocked(apiCall).mockResolvedValue({ ok: true, data: { offerReadiness: { ready: true, items: [] } } });
  render(<MentorOfferStatus />); expect((await screen.findByText(/Booking and payments are separate launch capabilities/)).textContent).toContain('Booking and payments are separate launch capabilities.');
});

