// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './table';
afterEach(cleanup);

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
