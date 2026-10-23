"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { z } from "zod";
import { Button } from "@mentio/ui/components/button";
import { Input } from "@mentio/ui/components/input";
import { Label } from "@mentio/ui/components/label";
import { Textarea } from "@mentio/ui/components/textarea";
import type { ApiResult, FieldErrors } from "../api/types";

export type CrudFieldType = "text" | "email" | "password" | "number" | "textarea";

export interface CrudField<Name extends string = string> {
  name: Name;
  label: string;
  type?: CrudFieldType;
  placeholder?: string;
  description?: string;
  autoComplete?: string;
}

type FieldName<S extends z.ZodObject> = Extract<keyof z.input<S>, string>;
type FormValues = Record<string, string>;

export interface CrudFormProps<S extends z.ZodObject> {
  /** The same Zod schema the API route validates with. Use `z.coerce` for numbers. */
  schema: S;
  fields: CrudField<FieldName<S>>[];
  initialValues?: Partial<Record<FieldName<S>, string | number | null>>;
  submitLabel?: string;
  onSubmit: (values: z.output<S>) => Promise<ApiResult<unknown>>;
  onSuccess?: (data: unknown) => void;
  onCancel?: () => void;
}

/**
 * Schema-driven create/edit form: validates client-side with the shared schema,
 * shows server `fieldErrors` next to their fields, Cmd/Ctrl+Enter submits and
 * Escape cancels.
 */
export function CrudForm<S extends z.ZodObject>({
  schema,
  fields,
  initialValues,
  submitLabel = "Save",
  onSubmit,
  onSuccess,
  onCancel,
}: CrudFormProps<S>) {
  const formId = useId();
  const [values, setValues] = useState<FormValues>(() => toFormValues(fields, initialValues));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    const parsed = schema.safeParse(toInput(values));
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors as FieldErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await onSubmit(parsed.data);
    setIsSubmitting(false);

    if (!result.ok) {
      setFieldErrors(result.error.fieldErrors ?? {});
      setFormError(result.error.message);
      return;
    }
    onSuccess?.(result.data);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
      return;
    }
    if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
      {fields.map((field) => {
        const inputId = `${formId}-${field.name}`;
        const errors = fieldErrors[field.name];
        const errorId = `${inputId}-error`;
        const commonProps = {
          id: inputId,
          name: field.name,
          value: values[field.name] ?? "",
          placeholder: field.placeholder,
          autoComplete: field.autoComplete,
          disabled: isSubmitting,
          "aria-invalid": errors ? true : undefined,
          "aria-describedby": errors ? errorId : undefined,
          onChange: (event: { target: { value: string } }) =>
            setValues((current) => ({ ...current, [field.name]: event.target.value })),
        };

        return (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={inputId}>{field.label}</Label>
            {field.type === "textarea" ? (
              <Textarea {...commonProps} />
            ) : (
              <Input {...commonProps} type={field.type ?? "text"} />
            )}
            {field.description && !errors && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
            {errors && (
              <p id={errorId} className="text-xs text-destructive">
                {errors.join(" ")}
              </p>
            )}
          </div>
        );
      })}

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function toFormValues(fields: CrudField[], initialValues: Partial<Record<string, string | number | null>> = {}): FormValues {
  return Object.fromEntries(fields.map((field) => [field.name, String(initialValues[field.name] ?? "")]));
}

/** Empty inputs become `undefined` so `.optional()` schema fields accept them. */
function toInput(values: FormValues): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value === "" ? undefined : value]));
}
