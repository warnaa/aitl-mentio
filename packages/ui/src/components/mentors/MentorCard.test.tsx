// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MentorCard } from './MentorCard';

afterEach(cleanup);
const props = {
  name: 'Ada Lovelace', introduction: 'Typed APIs and the errors around them.', stacks: ['TypeScript', 'React'],
  publicWorkUrl: 'https://example.test/ada', prices: { price25Cents: 8000, price50Cents: 15050, currency: 'PLN' },
  nextSlotStartsAt: '2026-11-12T09:00:00.000Z', href: '/m/ada',
};

it('shows the facts a mentee compares by, and links to the mentor page and public work', () => {
  render(<MentorCard {...props} />);
  const card = screen.getByRole('article', { name: 'Ada Lovelace' });
  expect(within(card).getByRole('heading', { name: 'Ada Lovelace' })).toBeTruthy();
  expect(within(card).getByText('TypeScript / React')).toBeTruthy();
  expect(within(card).getByText(props.introduction)).toBeTruthy();
  const prices = within(card).getByRole('group', { name: 'Session prices' });
  expect(prices.textContent).toMatch(/25 minutes: PLN\s80(?!\.)/);
  expect(prices.textContent).toMatch(/50 minutes: PLN\s150\.50/);
  expect(card.querySelector('time')?.getAttribute('dateTime')).toBe(props.nextSlotStartsAt);
  expect(within(card).getByRole('link', { name: /View profile/ }).getAttribute('href')).toBe('/m/ada');
  const work = within(card).getByRole('link', { name: /Public work/ });
  expect(work.getAttribute('href')).toBe('https://example.test/ada');
  expect(work.getAttribute('rel')).toBe('noopener noreferrer');
});

it('carries no score, rating or search control, and omits an absent description or public work', () => {
  render(<MentorCard {...props} introduction={null} publicWorkUrl={null} />);
  const card = screen.getByRole('article');
  expect(within(card).queryByRole('searchbox')).toBeNull();
  expect(card.textContent).not.toMatch(/rating|review|score|featured|★/i);
  expect(within(card).queryByRole('link', { name: /Public work/ })).toBeNull();
  expect(card.querySelector('.dm-mentor-card-intro')).toBeNull();
});
