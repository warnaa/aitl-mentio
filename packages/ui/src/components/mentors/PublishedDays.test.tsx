// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { PublishedDays } from './PublishedDays';
afterEach(cleanup);

it('renders one chip per weekday in time order, in UTC before hydration', () => {
  // 23:30 UTC on a Thursday is Friday east of UTC, so the server pass must use UTC.
  const startsAt = ['2099-11-06T10:00:00Z', '2099-11-05T23:30:00Z', '2099-11-06T12:00:00Z'];
  expect(renderToString(<PublishedDays startsAt={startsAt} />)).toMatch(/Thursday.*Friday/);
  render(<PublishedDays startsAt={startsAt} />);
  const chips = screen.getByRole('group', { name: 'Days with published sessions' }).children;
  expect(new Set([...chips].map(chip => chip.textContent)).size).toBe(chips.length);
});
