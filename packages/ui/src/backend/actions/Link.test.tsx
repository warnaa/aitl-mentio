// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Link } from './Link';
afterEach(cleanup);
it('retains native link semantics, destination and keyboard tab order', () => {
  const clicked = vi.fn(event => event.preventDefault());
  render(<Link href="/mentorzy/alex" className="custom-link" onClick={clicked} target="_blank" rel="noopener noreferrer">View public work</Link>);
  const link = screen.getByRole('link', { name: 'View public work' });
  expect(link.getAttribute('href')).toBe('/mentorzy/alex');
  expect(link.className).toContain('mentio-link');
  expect(link.className).toContain('custom-link');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  fireEvent.click(link);
  expect(clicked).toHaveBeenCalledTimes(1);
  link.focus();
  expect(document.activeElement).toBe(link);
});
it('works without presentation overrides', () => {
  render(<Link href="#question">Read your question</Link>);
  expect(screen.getByRole('link').getAttribute('href')).toBe('#question');
});
