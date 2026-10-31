// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Button } from './button';
import { Input } from './input';
import { Textarea } from './textarea';
import { Label } from './label';
afterEach(cleanup);
it('native disabled buttons block activation while enabled controls work', () => {
  const action = vi.fn();
  const { rerender } = render(<Button disabled onClick={action}>Publish page</Button>);
  fireEvent.click(screen.getByRole('button'));
  expect(action).not.toHaveBeenCalled();
  rerender(<Button onClick={action}>Publish page</Button>);
  fireEvent.click(screen.getByRole('button'));
  expect(action).toHaveBeenCalledTimes(1);
});
it('retains all button sizes/variants and asChild navigation without nesting interactive elements', () => {
  render(<><Button asChild variant="outline" size="sm"><a href="/mentorzy/alex">View mentor</a></Button><Button variant="destructive" size="icon-xs" aria-label="Remove public work link" /></>);
  const link = screen.getByRole('link');
  expect(link.getAttribute('href')).toBe('/mentorzy/alex');
  expect(link.getAttribute('data-variant')).toBe('outline');
  expect(link.getAttribute('data-size')).toBe('sm');
  expect(screen.getByRole('button').className).toContain('mentio-button-destructive');
});
it('keeps label relationships and native input attributes', () => {
  render(<><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="username" required aria-describedby="hint"/><p id="hint">Use your account email.</p><Label htmlFor="question">Question</Label><Textarea id="question" readOnly value="The ingress stopped." /></>);
  const email = screen.getByLabelText('Email') as HTMLInputElement;
  expect(email.type).toBe('email');
  expect(email.required).toBe(true);
  expect(email.autocomplete).toBe('username');
  expect((screen.getByLabelText('Question') as HTMLTextAreaElement).readOnly).toBe(true);
});
