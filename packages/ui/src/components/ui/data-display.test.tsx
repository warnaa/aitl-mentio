// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('skeleton is decorative by default but lets callers override it', () => {
  render(<><Skeleton data-testid="shape" className="h-4" /><Skeleton data-testid="visible" aria-hidden={false} /></>);
  const shape = screen.getByTestId('shape');
  expect(shape.getAttribute('aria-hidden')).toBe('true');
  expect(shape.className).toBe('mentio-skeleton h-4');
  expect(screen.getByTestId('visible').getAttribute('aria-hidden')).toBe('false');
});

it('table parts use token classes and keep native table semantics', () => {
  render(<Table><TableCaption>Your bookings</TableCaption><TableHeader><TableRow><TableHead>Time</TableHead></TableRow></TableHeader>
    <TableBody><TableRow data-state="selected"><TableCell>6 November 2026, 18:00</TableCell></TableRow></TableBody>
    <TableFooter><TableRow><TableCell>1 booking</TableCell></TableRow></TableFooter></Table>);
  const table = screen.getByRole('table', { name: 'Your bookings' });
  expect(table.className).toBe('mentio-table');
  expect(table.parentElement!.className).toBe('mentio-table-container');
  expect(screen.getByRole('columnheader').className).toBe('mentio-table-head');
  const selected = screen.getAllByRole('row')[1];
  expect(selected.className).toBe('mentio-table-row');
  expect(selected.dataset.state).toBe('selected');
  expect(screen.getByText('1 booking').closest('tfoot')!.className).toBe('mentio-table-footer');
});

// Regression (admin Users ledger L-14): a sideways-scrolling container without focusable cells was
// unreachable by keyboard (axe scrollable-region-focusable). jsdom has no layout, so sizes are stubbed.
function stubResizeObserver() {
  const instances: { callback: () => void; observed: Element[]; disconnect: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal('ResizeObserver', class {
    observed: Element[] = [];
    disconnect = vi.fn();
    constructor(public callback: () => void) { instances.push(this); }
    observe(target: Element) { this.observed.push(target); }
  });
  return instances;
}
const overflow = (container: HTMLElement, scrollWidth: number) => {
  Object.defineProperty(container, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(container, 'clientWidth', { configurable: true, value: 300 });
};

it('table container becomes a focusable region named like the table only while it overflows', () => {
  const observers = stubResizeObserver();
  const { unmount } = render(<Table aria-label="Users"><TableBody><TableRow><TableCell>kasia.nowak@example.test</TableCell></TableRow></TableBody></Table>);
  const container = screen.getByRole('table', { name: 'Users' }).parentElement!;
  const [observer] = observers;
  expect(observer.observed).toEqual([container, container.firstElementChild]);
  expect(container.hasAttribute('tabindex')).toBe(false);
  overflow(container, 600);
  act(() => observer.callback());
  expect(container.getAttribute('tabindex')).toBe('0');
  expect(screen.getByRole('region', { name: 'Users' })).toBe(container);
  overflow(container, 300);
  act(() => observer.callback());
  expect(container.hasAttribute('tabindex')).toBe(false);
  expect(container.hasAttribute('role')).toBe(false);
  unmount();
  expect(observer.disconnect).toHaveBeenCalledOnce();
});

it('an overflowing table named by aria-labelledby passes the reference; an unnamed one is focusable without a role', () => {
  const observers = stubResizeObserver();
  render(<><p id="caption">Bookings</p><Table aria-labelledby="caption"><TableBody><TableRow><TableCell>a</TableCell></TableRow></TableBody></Table><Table data-testid="unnamed" /></>);
  const named = screen.getByRole('table', { name: 'Bookings' }).parentElement!;
  const unnamed = screen.getByTestId('unnamed').parentElement!;
  overflow(named, 600);
  overflow(unnamed, 600);
  act(() => observers.forEach(observer => observer.callback()));
  expect(screen.getByRole('region', { name: 'Bookings' })).toBe(named);
  expect(named.getAttribute('aria-labelledby')).toBe('caption');
  expect(unnamed.getAttribute('tabindex')).toBe('0');
  expect(unnamed.hasAttribute('role')).toBe(false);
  expect(observers[1].observed).toEqual([unnamed, screen.getByTestId('unnamed')]);
});

it('table keeps working without ResizeObserver', () => {
  vi.stubGlobal('ResizeObserver', undefined);
  render(<Table aria-label="Users" />);
  expect(screen.getByRole('table', { name: 'Users' }).parentElement!.hasAttribute('tabindex')).toBe(false);
});
