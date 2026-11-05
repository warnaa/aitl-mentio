// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { LocalTime } from './LocalTime';
afterEach(cleanup);
it('renders deterministic UTC before hydration then the viewer zone after mount', () => {
  const value = '2026-11-04T12:00:00Z';
  expect(renderToString(<LocalTime value={value} />)).toContain('(UTC)');
  render(<LocalTime value={value} />);
  expect(
    screen
      .getByText(new RegExp(Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('/', '\\/')))
      .getAttribute('datetime'),
  ).toBe(value);
});
it('exposes the viewer timezone with UTC before hydration', async () => {
  const { useViewerTimeZone } = await import('./LocalTime');
  function Zone() { return <span>{useViewerTimeZone()}</span>; }
  expect(renderToString(<Zone />)).toContain('UTC');
  render(<Zone />);
  expect(screen.getByText(Intl.DateTimeFormat().resolvedOptions().timeZone)).toBeTruthy();
});
