// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Input } from '@mentio/ui/components/input';
import { Textarea } from '@mentio/ui/components/textarea';
import { FormField } from './FormField';
afterEach(cleanup);
it('generates distinct IDs and visible label associations for repeated fields', () => {
  render(<><FormField label="First question"><Input /></FormField><FormField label="Second question"><Textarea /></FormField></>);
  const first = screen.getByRole('textbox', { name: 'First question' });
  const second = screen.getByRole('textbox', { name: 'Second question' });
  expect(first.id).not.toBe(second.id);
  expect(screen.getAllByText('Optional')).toHaveLength(2);
  expect(first.hasAttribute('required')).toBe(false);
  expect(first.getAttribute('aria-describedby')).toBeNull();
  fireEvent.change(first, { target: { value: 'Ingress returns 503 after the upgrade.' } });
  expect((first as HTMLInputElement).value).toContain('503');
});
it('keeps hints and server errors alongside any existing description', () => {
  render(<><p id="prior">A saved draft exists.</p><FormField id="question" label="Your question" description="Include the error and what you tried." error="Use at least 20 characters." required><Textarea aria-describedby="prior" /></FormField></>);
  const input = screen.getByRole('textbox', { name: 'Your question' });
  expect(input.id).toBe('question');
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.getAttribute('aria-describedby')).toBe('prior question-description question-error');
  expect(document.getElementById('question-description')?.textContent).toContain('what you tried');
  expect(document.getElementById('question-error')?.textContent).toContain('20');
  expect((input as HTMLTextAreaElement).required).toBe(true);
  expect(screen.getByText('Required')).toBeTruthy();
});
it('preserves child id, validity and disabled/required flags when wrapper does not override them', () => {
  render(<FormField label="Rate" description="Save the page before changing this rate."><Input id="saved-rate" aria-invalid="grammar" required disabled /></FormField>);
  const input = screen.getByRole('textbox', { name: 'Rate' }) as HTMLInputElement;
  expect(input.id).toBe('saved-rate');
  expect(input.disabled).toBe(true);
  expect(input.required).toBe(true);
  expect(input.getAttribute('aria-invalid')).toBe('grammar');
  expect(input.getAttribute('aria-describedby')).toBe('saved-rate-description');
});
it('honors explicit wrapper flags and localized requirement text', () => {
  render(<FormField id="wrapper" label="Public work" required={false} disabled={false} requirementLabel="Not required" className="custom-field"><Input id="child" required disabled /></FormField>);
  const input = screen.getByRole('textbox', { name: 'Public work' }) as HTMLInputElement;
  expect(input.id).toBe('wrapper');
  expect(input.required).toBe(false);
  expect(input.disabled).toBe(false);
  expect(screen.getByText('Not required')).toBeTruthy();
  expect(input.parentElement?.className).toContain('custom-field');
});
it('updates field semantics when the caller clears an error and disables the control', () => {
  const { rerender } = render(<FormField label="Your question" error="Add a question."><Input /></FormField>);
  expect(screen.getByRole('textbox', { name: 'Your question' }).getAttribute('aria-invalid')).toBe('true');
  rerender(<FormField label="Your question" disabled><Input /></FormField>);
  const input = screen.getByRole('textbox', { name: 'Your question' }) as HTMLInputElement;
  expect(screen.queryByText('Add a question.')).toBeNull();
  expect(input.getAttribute('aria-describedby')).toBeNull();
  expect(input.getAttribute('aria-invalid')).toBeNull();
  expect(input.disabled).toBe(true);
});
