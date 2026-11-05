'use client';

import { z } from 'zod';
import { CrudForm, type CrudField, type CrudFieldRenderProps } from '../../backend/forms/CrudForm';
import type { FieldErrors } from '../../backend/api/types';
import { TechnologyIcon } from './TechnologyChips';

/** The profile fields, named as the mentor profile API names them. */
export interface MentorProfileValues {
  /** Shown only when the host lets the mentor edit their name here. */
  displayName?: string;
  publicWorkUrl: string;
  bio: string;
  stackTags: string[];
}

/** A technology a mentor can choose: the stored value and the label people see. */
export interface MentorStackOption { value: string; label: string }

export interface MentorProfileEditorProps {
  initialValues: MentorProfileValues;
  endpoint: string;
  onSaved: (data: unknown) => void;
  onCancel: () => void;
  onSubmittingChange?: (submitting: boolean) => void;
  /** Defaults to the four offered technologies. */
  stackOptions?: readonly MentorStackOption[];
  /** The host's validation, e.g. a draft schema that allows empty fields. Defaults to a complete profile. */
  schema?: z.ZodType;
  /** Errors from a related action, such as a refused publish, keyed by field name. */
  externalFieldErrors?: FieldErrors;
}

export const offeredStacks: readonly MentorStackOption[] = ['TypeScript', 'React', 'Python', 'AI agents'].map(stack => ({ value: stack, label: stack }));

export const mentorProfileMessages = {
  displayName: 'Enter the name people should see.',
  displayNameLength: 'Keep your name within 120 characters.',
  bio: 'Describe the problems you can help with.',
  bioLength: 'Keep your description within 2,000 characters.',
  publicWorkUrl: 'Add a full public link starting with https:// or http://.',
  stackTags: 'Choose at least one technology or topic.',
} as const;

/** A web link: `http` or `https` only. */
export const publicWorkUrlSchema = z.string().trim().pipe(z.url({ protocol: /^https?$/, error: mentorProfileMessages.publicWorkUrl }));

/** Complete-profile validation with the offered technologies. */
export function mentorProfileSchema(options: readonly MentorStackOption[] = offeredStacks, withName = true) {
  const values = new Set(options.map(option => option.value));
  const labels = new Intl.ListFormat('en-GB', { type: 'disjunction' }).format(options.map(option => option.label));
  const base = z.object({
    publicWorkUrl: publicWorkUrlSchema,
    bio: z.string().trim().min(1, mentorProfileMessages.bio).max(2000, mentorProfileMessages.bioLength),
    stackTags: z.array(z.string()).min(1, mentorProfileMessages.stackTags)
      .refine(stacks => stacks.every(stack => values.has(stack)), `Choose ${labels}.`),
  });
  return withName ? base.extend({ displayName: z.string().trim().min(1, mentorProfileMessages.displayName).max(120, mentorProfileMessages.displayNameLength) }) : base;
}

function StackPicker({ inputProps, labelId, value, onChange, options }: CrudFieldRenderProps & { options: readonly MentorStackOption[] }) {
  const selected = value as string[];
  const offered = new Set(options.map(option => option.value));
  return <fieldset id={inputProps.id} className="dm-mentor-stack-picker" disabled={inputProps.disabled}
    aria-labelledby={labelId} aria-invalid={inputProps['aria-invalid']}
    aria-describedby={inputProps['aria-describedby']} tabIndex={-1}>
    {options.map(option => <label key={option.value} className="dm-mentor-stack-choice">
      <input type="checkbox" name={inputProps.name} value={option.value} checked={selected.includes(option.value)}
        onChange={event => {
          const supported = selected.filter(item => offered.has(item));
          onChange(event.target.checked ? [...supported, option.value] : supported.filter(item => item !== option.value));
        }} />
      <TechnologyIcon stack={option.label} />
      <span>{option.label}</span>
    </label>)}
  </fieldset>;
}

const nameField: CrudField = { name: 'displayName', label: 'Display name', required: true, autoComplete: 'name', description: 'Use the name you want on your public mentor profile.' };

/**
 * The designed profile form (prototype s27). Saving validates and stores profile
 * details; the host handles publication separately and may pass a draft schema.
 */
export function MentorProfileEditor({ initialValues, endpoint, onSaved, onCancel, onSubmittingChange, stackOptions = offeredStacks, schema, externalFieldErrors }: MentorProfileEditorProps) {
  const withName = initialValues.displayName !== undefined;
  const fields: CrudField[] = [
    ...(withName ? [nameField] : []),
    { name: 'bio', label: 'About your mentoring', type: 'textarea', required: true, placeholder: 'Describe a problem you can help someone solve.', description: 'Share the topics you know and the kind of help people can expect. Up to 2,000 characters.' },
    { name: 'publicWorkUrl', label: 'Public work link', required: true, autoComplete: 'url', placeholder: 'https://github.com/your-name', description: 'Link to a public repository, portfolio or technical article that shows your work.' },
    { name: 'stackTags', label: 'Technologies and topics', required: true, description: 'Choose at least one. People will see these on your profile.', render: props => <StackPicker {...props} options={stackOptions} /> },
  ];
  return <div className="dm-mentor-profile-editor">
    <CrudForm schema={schema ?? mentorProfileSchema(stackOptions, withName)} fields={fields} endpoint={endpoint} method="PUT" initialValues={{ ...initialValues }}
      submitLabel="Save profile" onSuccess={onSaved} onCancel={onCancel} onSubmittingChange={onSubmittingChange} externalFieldErrors={externalFieldErrors} />
  </div>;
}
