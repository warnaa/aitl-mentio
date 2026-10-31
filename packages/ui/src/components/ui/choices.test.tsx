// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Badge } from './badge';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Select, SelectTrigger, SelectValue } from './select';
import { Separator } from './separator';
afterEach(cleanup);

it('checkbox toggles through its visible label and reports the new state', () => {
  const change = vi.fn();
  render(<><Checkbox id="listed" onCheckedChange={change} /><Label htmlFor="listed">Show me in the mentor list</Label></>);
  const box = screen.getByRole('checkbox', { name: 'Show me in the mentor list' });
  fireEvent.click(screen.getByText('Show me in the mentor list'));
  expect(box.getAttribute('aria-checked')).toBe('true');
  expect(change).toHaveBeenLastCalledWith(true);
  expect(box.className).toContain('mentio-checkbox');
});

it('radio group selects exactly one labelled option', () => {
  const change = vi.fn();
  render(<RadioGroup aria-label="Session length" onValueChange={change}>
    <RadioGroupItem id="len-25" value="25" /><Label htmlFor="len-25">25 minutes — 120 PLN</Label>
    <RadioGroupItem id="len-50" value="50" /><Label htmlFor="len-50">50 minutes — 240 PLN</Label>
  </RadioGroup>);
  fireEvent.click(screen.getByRole('radio', { name: '50 minutes — 240 PLN' }));
  expect(change).toHaveBeenLastCalledWith('50');
  expect(screen.getByRole('radio', { name: '25 minutes — 120 PLN' }).getAttribute('aria-checked')).toBe('false');
});

it('select keeps one approved trigger size and exposes the chosen value', () => {
  render(<Select defaultValue="50" required><SelectTrigger aria-label="Session length"><SelectValue placeholder="Choose a length" /></SelectTrigger></Select>);
  const trigger = screen.getByRole('combobox', { name: 'Session length' });
  expect(trigger.hasAttribute('data-size')).toBe(false);
  expect(trigger.className).toBe('mentio-select-trigger');
  expect(trigger.getAttribute('aria-required')).toBe('true');
});

it('badge maps every retained variant to its token class and supports link rendering', () => {
  const variants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const;
  render(<>{variants.map(variant => <Badge key={variant} variant={variant}>{variant}</Badge>)}<Badge asChild variant="outline"><a href="#details">Awaiting payment</a></Badge></>);
  for (const variant of variants) {
    const badge = screen.getByText(variant);
    expect(badge.dataset.variant).toBe(variant);
    expect(badge.className).toContain(`mentio-badge-${variant === 'default' ? 'primary' : variant}`);
  }
  expect(screen.getByRole('link', { name: 'Awaiting payment' }).className).toContain('mentio-badge-outline');
});

it('separator is hidden from assistive technology unless it is marked semantic', () => {
  render(<><Separator data-testid="decorative" /><Separator decorative={false} orientation="vertical" /></>);
  expect(screen.getByTestId('decorative').getAttribute('role')).toBe('none');
  expect(screen.getByRole('separator').getAttribute('aria-orientation')).toBe('vertical');
});

it('card parts keep their slots and let callers merge utilities', () => {
  render(<Card className="max-w-full"><CardHeader><CardTitle className="tabular-nums"><h2>Booking summary</h2></CardTitle><CardDescription>Text session</CardDescription><CardAction>Edit</CardAction></CardHeader><CardContent>50 minutes</CardContent><CardFooter>Pay</CardFooter></Card>);
  const title = screen.getByRole('heading', { name: 'Booking summary' }).parentElement!;
  expect(title.className).toBe('mentio-card-title tabular-nums');
  expect(title.closest('[data-slot=card]')!.className).toBe('mentio-card max-w-full');
  expect(screen.getByText('Edit').dataset.slot).toBe('card-action');
});
