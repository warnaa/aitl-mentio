// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiCall } from '../../backend/api/apiCall';
import type { ApiResult } from '../../backend/api/types';
import { z } from 'zod';
import { MentorProfileEditor, mentorProfileSchema, type MentorProfileEditorProps, type MentorProfileValues } from './MentorProfileEditor';

vi.mock('../../backend/api/apiCall', () => ({ apiCall: vi.fn() }));
const request = vi.mocked(apiCall);
const filled: MentorProfileValues = {
  displayName: 'Alex Laurent', bio: 'I help debug TypeScript APIs and review migration plans.',
  publicWorkUrl: 'https://github.com/alex-example', stackTags: ['TypeScript', 'React'],
};
function props(overrides: Partial<MentorProfileEditorProps> = {}): MentorProfileEditorProps {
  return { initialValues: filled, endpoint: '/api/mentors/profile', onSaved: vi.fn(), onCancel: vi.fn(), ...overrides };
}
beforeEach(() => { request.mockReset(); request.mockResolvedValue({ ok: true, data: { saved: true } }); });
afterEach(cleanup);

it('labels the fields and submits edited values through CrudForm', async () => {
  const callbacks = props();
  render(<MentorProfileEditor {...callbacks} />);
  const group = screen.getByRole('group', { name: 'Technologies and topics' });
  expect(document.getElementById(group.getAttribute('aria-describedby')!)?.textContent).toContain('Choose at least one.');
  for (const label of ['TypeScript', 'React', 'Python', 'AI agents']) {
    const checkbox = screen.getByRole('checkbox', { name: label });
    expect(checkbox.parentElement?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  }
  fireEvent.click(screen.getByRole('checkbox', { name: 'TypeScript' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Python' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Display name' }), { target: { value: '  Alex L.  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledWith({ saved: true }));
  expect(request).toHaveBeenCalledWith('/api/mentors/profile', { method: 'PUT', body: { ...filled, displayName: 'Alex L.', stackTags: ['React', 'Python'] } });
  expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['Cancel', 'Save profile']);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(callbacks.onCancel).toHaveBeenCalledOnce();
});

it('validates all empty required fields and focuses the first input', () => {
  render(<MentorProfileEditor {...props({ initialValues: { displayName: '', bio: '', publicWorkUrl: '', stackTags: [] } })} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Display name' }));
  expect(screen.getByText('Enter the name people should see.')).toBeTruthy();
  expect(screen.getByText('Describe the problems you can help with.')).toBeTruthy();
  expect(screen.getByText('Add a full public link starting with https:// or http://.')).toBeTruthy();
  expect(screen.getByText('Choose at least one technology or topic.')).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
});

it('focuses the required technology group on Ctrl+Enter and clears the error on a valid submission', async () => {
  const callbacks = props({ initialValues: { ...filled, stackTags: [] } });
  render(<MentorProfileEditor {...callbacks} />);
  const group = screen.getByRole('group', { name: 'Technologies and topics' });
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Public work link' }), { key: 'Enter', ctrlKey: true });
  expect(group.getAttribute('aria-invalid')).toBe('true');
  expect(document.activeElement).toBe(group);
  expect(group.getAttribute('aria-describedby')).toContain(screen.getByRole('alert').id);
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: 'React' }));
  fireEvent.keyDown(screen.getByRole('checkbox', { name: 'React' }), { key: 'Enter', metaKey: true });
  await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledOnce());
  expect(group.getAttribute('aria-invalid')).toBe('false');
});

it.each(['javascript:alert(1)', 'ftp://example.com/work', 'not a link'])('rejects a non-web work URL: %s', value => {
  render(<MentorProfileEditor {...props({ initialValues: { ...filled, publicWorkUrl: value } })} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  expect(screen.getByRole('alert').textContent).toBe('Add a full public link starting with https:// or http://.');
  expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Public work link' }));
  expect(request).not.toHaveBeenCalled();
});

it('accepts a public HTTP URL and rejects excessive name and description lengths', async () => {
  const callbacks = props({ initialValues: { ...filled, publicWorkUrl: ' http://example.com/work ', displayName: 'A'.repeat(121), bio: 'A'.repeat(2001) } });
  render(<MentorProfileEditor {...callbacks} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  expect(screen.getByText('Keep your name within 120 characters.')).toBeTruthy();
  expect(screen.getByText('Keep your description within 2,000 characters.')).toBeTruthy();
  expect(request).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Display name' }), { target: { value: 'A'.repeat(120) } });
  fireEvent.change(screen.getByRole('textbox', { name: 'About your mentoring' }), { target: { value: 'A'.repeat(2000) } });
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledOnce());
  expect(request.mock.calls[0]![1]?.body).toMatchObject({ publicWorkUrl: 'http://example.com/work' });
});

it('rejects unsupported initial technologies and replaces them when the user chooses supported topics', async () => {
  const callbacks = props({ initialValues: { ...filled, stackTags: ['Elixir'] } });
  render(<MentorProfileEditor {...callbacks} />);
  expect(screen.getAllByRole('checkbox')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByText('Choose TypeScript, React, Python or AI agents.')).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Technologies and topics' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Python' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledOnce());
  expect(request.mock.calls[0]![1]?.body).toMatchObject({ stackTags: ['Python'] });
});

it('disables fields and competing actions while saving, preserves edits after failure, and retries', async () => {
  let complete!: (result: ApiResult<unknown>) => void;
  request.mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
  const callbacks = props({ onSubmittingChange: vi.fn() });
  render(<MentorProfileEditor {...callbacks} />);
  const form = screen.getByRole('button', { name: 'Save profile' }).closest('form')!;
  act(() => { fireEvent.submit(form); fireEvent.submit(form); });
  expect(request).toHaveBeenCalledOnce();
  expect(callbacks.onSubmittingChange).toHaveBeenCalledWith(true);
  expect(screen.getByRole<HTMLFieldSetElement>('group', { name: 'Technologies and topics' }).disabled).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Cancel' }).disabled).toBe(true);
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Saving…' }).disabled).toBe(true);
  fireEvent.keyDown(form, { key: 'Escape' });
  expect(callbacks.onCancel).not.toHaveBeenCalled();
  await act(async () => complete({ ok: false, error: { code: 'unavailable', message: 'Profile could not be saved. Try again.' } }));
  expect(screen.getByRole('alert').textContent).toBe('Profile could not be saved. Try again.');
  expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'About your mentoring' }).value).toBe(filled.bio);
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'React' }).checked).toBe(true);
  expect(callbacks.onSubmittingChange).toHaveBeenLastCalledWith(false);
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledOnce());
});

it('associates a server technology error with the group and preserves its selected values', async () => {
  request.mockResolvedValue({ ok: false, error: { code: 'validation_error', message: 'Check the profile.', fieldErrors: { stackTags: ['Choose a supported technology.'] } } });
  render(<MentorProfileEditor {...props()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await screen.findByText('Choose a supported technology.');
  const group = screen.getByRole('group', { name: 'Technologies and topics' });
  expect(document.activeElement).toBe(group);
  expect(group.getAttribute('aria-describedby')).toContain(screen.getByRole('alert').id);
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'TypeScript' }).checked).toBe(true);
});

it('uses host technologies and validation, and leaves the name to the host when it is not supplied', async () => {
  const draft = z.object({ publicWorkUrl: z.string(), bio: z.string(), stackTags: z.array(z.string()) });
  const callbacks = props({ initialValues: { publicWorkUrl: '', bio: '', stackTags: ['ai-agents'] }, stackOptions: [{ value: 'react', label: 'React' }, { value: 'ai-agents', label: 'AI agents' }], schema: draft });
  render(<MentorProfileEditor {...callbacks} />);
  expect(screen.queryByRole('textbox', { name: 'Display name' })).toBeNull();
  expect(screen.getByRole<HTMLInputElement>('checkbox', { name: 'AI agents' }).checked).toBe(true);
  fireEvent.click(screen.getByRole('checkbox', { name: 'React' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
  await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledOnce());
  expect(request.mock.calls[0]![1]?.body).toEqual({ publicWorkUrl: '', bio: '', stackTags: ['ai-agents', 'react'] });
});

it('builds the complete-profile schema without a name for hosts that own it', () => {
  const schema = mentorProfileSchema([{ value: 'react', label: 'React' }], false);
  expect(schema.safeParse({ publicWorkUrl: 'https://example.com', bio: 'Help', stackTags: ['react'] }).success).toBe(true);
  expect(schema.safeParse({ publicWorkUrl: 'https://example.com', bio: 'Help', stackTags: ['python'] }).error?.issues[0]?.message).toBe('Choose React.');
});
