'use client';

import { cloneElement, useId, type ComponentProps, type ReactElement } from 'react';
import { Label } from '@mentio/ui/components/label';
import { cn } from '@mentio/ui/lib/utils';

type ControlProps = Pick<ComponentProps<'input'>, 'id' | 'required' | 'disabled' | 'aria-describedby' | 'aria-invalid'>;
export interface FormFieldProps {
  id?: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  requirementLabel?: string;
  className?: string;
  children: ReactElement<ControlProps>;
}

/** Shared label/hint/error anatomy. The caller owns value and validation. */
export function FormField({ id, label, description, error, required, disabled, requirementLabel, className, children }: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? children.props.id ?? generatedId;
  const isRequired = required ?? children.props.required ?? false;
  const isDisabled = disabled ?? children.props.disabled ?? false;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [children.props['aria-describedby'], descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  return <div className={cn('mentio-field', className)}>
    <Label htmlFor={controlId}>{label}<span className="mentio-field-requirement" aria-hidden="true">{requirementLabel ?? (isRequired ? 'Required' : 'Optional')}</span></Label>
    {cloneElement(children, { id: controlId, required: isRequired, disabled: isDisabled, 'aria-describedby': describedBy, 'aria-invalid': error ? true : children.props['aria-invalid'] })}
    {description && <p id={descriptionId} className="mentio-field-description">{description}</p>}
    {error && <p id={errorId} className="mentio-field-error">{error}</p>}
  </div>;
}
