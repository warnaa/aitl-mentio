"use client";

import { useEffect, useId, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from "react";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { Button } from "@mentio/ui/components/button";
import { Checkbox } from "@mentio/ui/components/checkbox";
import { Input } from "@mentio/ui/components/input";
import { Label } from "@mentio/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@mentio/ui/components/select";
import { Textarea } from "@mentio/ui/components/textarea";
import type { ApiResult, FieldErrors } from "../api/types";

export type CrudFieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "textarea"
  | "select"
  | "checkbox"
  | "money"
  | "datetime"
  | "urlList";

export interface CrudFieldOption {
  value: string;
  /** Carries the consequence of the choice, e.g. "50 minutes — 240 zł". */
  label: string;
}

export interface CrudField<Name extends string = string> {
  name: Name;
  label: string;
  type?: CrudFieldType;
  placeholder?: string;
  description?: string;
  autoComplete?: string;
  /** `select`: the fixed choices. */
  options?: CrudFieldOption[];
  /** `money`: unit shown after the amount (F4: an integer amount in złoty). */
  suffix?: string;
  /** `datetime`: step in seconds for the native picker (F4: 15 minutes). */
  step?: number;
  /** `urlList`: maximum number of rows. */
  max?: number;
  /** `urlList`: row name used in accessible labels, e.g. "Link" → "Link 2". */
  itemLabel?: string;
  addLabel?: string;
  removeLabel?: string;
}

type FieldName<S extends z.ZodObject> = Extract<keyof z.input<S>, string>;
type FormValue = string | boolean | string[];
type FormValues = Record<string, FormValue>;
type InitialValue = string | number | boolean | null | string[];

export interface CrudFormProps<S extends z.ZodObject> {
  /** The same Zod schema the API route validates with. Use `z.coerce` for numbers. */
  schema: S;
  fields: CrudField<FieldName<S>>[];
  initialValues?: Partial<Record<FieldName<S>, InitialValue>>;
  submitLabel?: string;
  onSubmit: (values: z.output<S>) => Promise<ApiResult<unknown>>;
  onSuccess?: (data: unknown) => void;
  onCancel?: () => void;
  /** Errors from another action (e.g. publish); local validation errors take precedence. */
  externalFieldErrors?: FieldErrors;
  /** Called when the values start or stop differing from the last successful save. */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Schema-driven create/edit form: validates a field when it loses focus and the whole
 * form on submit with the shared schema, focuses the first error after a failed submit,
 * keeps entered values, ignores a second submit while saving, shows server
 * `fieldErrors` next to their fields, Cmd/Ctrl+Enter submits and Escape cancels.
 */
export function CrudForm<S extends z.ZodObject>({
  schema,
  fields,
  initialValues,
  submitLabel = "Save",
  onSubmit,
  onSuccess,
  onCancel,
  externalFieldErrors,
  onDirtyChange,
}: CrudFormProps<S>) {
  const formId = useId();
  const initialKey = JSON.stringify(toFormValues(fields, initialValues));
  const [values, setValues] = useState<FormValues>(() => toFormValues(fields, initialValues));
  const [baseline, setBaseline] = useState<string>(() => serialize(fields, toFormValues(fields, initialValues)));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adoptedKey, setAdoptedKey] = useState(initialKey);
  const focusTarget = useRef<string | null>(null);
  const submitting = useRef(false);
  const reportedDirty = useRef(false);
  const dirty = serialize(fields, values) !== baseline;

  // A refreshed server value is adopted only while the person has no unsaved input.
  // Adjusting state during render (not in an effect) avoids a second, cascading render.
  if (initialKey !== adoptedKey) {
    setAdoptedKey(initialKey);
    if (!dirty) {
      const next = JSON.parse(initialKey) as FormValues;
      setValues(next);
      setBaseline(serialize(fields, next));
    }
  }

  useEffect(() => {
    if (dirty === reportedDirty.current) return;
    reportedDirty.current = dirty;
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Focus moves only once fields are enabled again after a submission. Every request
  // is followed by a state change, so this runs after the render that re-enables fields.
  useEffect(() => {
    if (!focusTarget.current || isSubmitting) return;
    document.getElementById(focusTarget.current)?.focus();
    focusTarget.current = null;
  });

  function setFocusTarget(id: string) {
    focusTarget.current = id;
  }

  const idFor = (field: CrudField) => `${formId}-${field.name}`;
  const focusIdFor = (field: CrudField) => (field.type === "urlList" ? `${idFor(field)}-0` : idFor(field));
  const formErrorId = `${formId}-form-error`;

  function collectErrors(current: FormValues): FieldErrors {
    const parsed = schema.safeParse(toInput(current));
    return parsed.success ? {} : (z.flattenError(parsed.error).fieldErrors as FieldErrors);
  }

  function validateField(name: string, current: FormValues) {
    const errors = collectErrors(current)[name];
    setFieldErrors((existing) => {
      const next = { ...existing };
      if (errors) next[name] = errors;
      else delete next[name];
      return next;
    });
  }

  function change(name: string, value: FormValue) {
    const next = { ...values, [name]: value };
    setValues(next);
    // An error already shown is re-checked while typing, so it disappears once fixed.
    if (fieldErrors[name]) validateField(name, next);
  }

  function handleBlur(name: string) {
    return (event: FocusEvent<HTMLElement>) => {
      // Opening a select moves focus into its list; that is not leaving the field.
      if (event.relatedTarget instanceof Element && event.relatedTarget.closest("[role=listbox]")) return;
      validateField(name, values);
    };
  }

  function focusFirstError(errors: FieldErrors, hasFormError: boolean) {
    const first = fields.find((field) => errors[field.name]);
    if (first) setFocusTarget(focusIdFor(first));
    else if (hasFormError) setFocusTarget(formErrorId);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setFormError(null);

    const parsed = schema.safeParse(toInput(values));
    if (!parsed.success) {
      const errors = z.flattenError(parsed.error).fieldErrors as FieldErrors;
      setFieldErrors(errors);
      focusFirstError(errors, false);
      return;
    }

    setFieldErrors({});
    submitting.current = true;
    setIsSubmitting(true);
    const result = await onSubmit(parsed.data);
    submitting.current = false;
    setIsSubmitting(false);

    if (!result.ok) {
      const errors = result.error.fieldErrors ?? {};
      setFieldErrors(errors);
      setFormError(result.error.message);
      focusFirstError(errors, true);
      return;
    }
    setBaseline(serialize(fields, values));
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
    <form noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="mentio-crud-form">
      {fields.map((field) => {
        const inputId = idFor(field);
        const errors = fieldErrors[field.name] ?? externalFieldErrors?.[field.name];
        const errorId = `${inputId}-error`;
        const descriptionId = `${inputId}-description`;
        const showDescription = Boolean(field.description) && !errors;
        const describedBy = [showDescription ? descriptionId : undefined, errors ? errorId : undefined].filter(Boolean).join(" ") || undefined;
        const required = isRequired(schema, field.name);
        const value = values[field.name];
        // `required` is set per control: a select gets it on its root and a list as a whole.
        const control = {
          id: inputId,
          disabled: isSubmitting,
          "aria-invalid": errors ? true : undefined,
          "aria-describedby": describedBy,
          onBlur: handleBlur(field.name),
        };
        const messages = (
          <>
            {showDescription && (
              <p id={descriptionId} className="mentio-field-description">
                {field.description}
              </p>
            )}
            {errors && (
              <p id={errorId} className="mentio-field-error">
                {errors.join(" ")}
              </p>
            )}
          </>
        );
        const requirement = (
          <span className="mentio-field-requirement" aria-hidden="true">
            {required ? "Required" : "Optional"}
          </span>
        );

        if (field.type === "checkbox") {
          return (
            <div key={field.name} className="mentio-field">
              <div className="mentio-crud-checkbox">
                <Checkbox
                  {...control}
                  required={required}
                  name={field.name}
                  checked={value === true}
                  onCheckedChange={(checked) => change(field.name, checked === true)}
                />
                <Label htmlFor={inputId}>{field.label}</Label>
              </div>
              {messages}
            </div>
          );
        }

        if (field.type === "urlList") {
          const rows = Array.isArray(value) ? value : [""];
          const legendId = `${inputId}-legend`;
          const itemLabel = field.itemLabel ?? "Link";
          const atMax = field.max !== undefined && rows.length >= field.max;
          return (
            <fieldset key={field.name} className="mentio-field mentio-crud-list" aria-describedby={describedBy}>
              <legend id={legendId} className="mentio-crud-legend">
                <span className="mentio-label">{field.label}</span>
                {requirement}
              </legend>
              {rows.map((row, index) => (
                <div key={index} className="mentio-crud-list-row">
                  <Input
                    {...control}
                    id={`${inputId}-${index}`}
                    type="url"
                    inputMode="url"
                    aria-label={`${itemLabel} ${index + 1}`}
                    value={row}
                    placeholder={field.placeholder}
                    onChange={(event) => change(field.name, rows.map((item, at) => (at === index ? event.target.value : item)))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isSubmitting}
                    aria-label={`${field.removeLabel ?? "Remove link"} ${index + 1}`}
                    onClick={() => {
                      const remaining = rows.filter((_, at) => at !== index);
                      change(field.name, remaining.length ? remaining : [""]);
                      setFocusTarget(`${inputId}-${Math.max(0, index - 1)}`);
                    }}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting || atMax}
                  aria-describedby={showDescription ? descriptionId : undefined}
                  onClick={() => {
                    change(field.name, [...rows, ""]);
                    setFocusTarget(`${inputId}-${rows.length}`);
                  }}
                >
                  <Plus aria-hidden="true" />
                  {field.addLabel ?? "Add link"}
                </Button>
              </div>
              {messages}
            </fieldset>
          );
        }

        const text = typeof value === "string" ? value : "";
        const onTextChange = (event: { target: { value: string } }) => change(field.name, event.target.value);
        let input;
        if (field.type === "textarea") {
          input = <Textarea {...control} required={required} name={field.name} value={text} placeholder={field.placeholder} autoComplete={field.autoComplete} onChange={onTextChange} />;
        } else if (field.type === "select") {
          input = (
            <Select value={text} onValueChange={(next) => change(field.name, next)} disabled={isSubmitting} required={required} name={field.name}>
              <SelectTrigger {...control} className="w-full">
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {(field.options ?? []).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        } else if (field.type === "money") {
          const suffixId = `${inputId}-suffix`;
          input = (
            <div className="mentio-input-affix">
              <Input
                {...control}
                required={required}
                aria-describedby={[suffixId, describedBy].filter(Boolean).join(" ")}
                name={field.name}
                type="text"
                inputMode="numeric"
                value={text}
                placeholder={field.placeholder}
                onChange={onTextChange}
              />
              <span id={suffixId} className="mentio-input-suffix">
                {field.suffix ?? "zł"}
              </span>
            </div>
          );
        } else {
          input = (
            <Input
              {...control}
              required={required}
              name={field.name}
              type={field.type === "datetime" ? "datetime-local" : (field.type ?? "text")}
              step={field.type === "datetime" ? (field.step ?? 900) : undefined}
              value={text}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              onChange={onTextChange}
            />
          );
        }

        return (
          <div key={field.name} className="mentio-field">
            <div className="mentio-crud-label-row">
              <Label htmlFor={inputId}>{field.label}</Label>
              {requirement}
            </div>
            {input}
            {messages}
          </div>
        );
      })}

      {formError && (
        <p id={formErrorId} role="alert" tabIndex={-1} className="mentio-crud-form-error">
          {formError}
        </p>
      )}

      <div className="mentio-crud-actions">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function toFormValues(fields: CrudField[], initialValues: Partial<Record<string, InitialValue>> = {}): FormValues {
  return Object.fromEntries(
    fields.map((field) => {
      const initial = initialValues[field.name];
      if (field.type === "checkbox") return [field.name, initial === true];
      if (field.type === "urlList") return [field.name, Array.isArray(initial) && initial.length ? [...initial] : [""]];
      return [field.name, String(initial ?? "")];
    }),
  );
}

/** Dirty state compares the visible fields only, in field order. */
function serialize(fields: CrudField[], values: FormValues): string {
  return JSON.stringify(fields.map((field) => values[field.name] ?? ""));
}

/** Empty text inputs become `undefined` so `.optional()` schema fields accept them. */
function toInput(values: FormValues): Record<string, FormValue | undefined> {
  return Object.fromEntries(Object.entries(values).map(([name, value]) => [name, value === "" ? undefined : value]));
}

/** A field is required when its schema rejects a missing value. */
function isRequired(schema: z.ZodObject, name: string): boolean {
  const field = schema.shape[name] as z.ZodType | undefined;
  return field ? !field.safeParse(undefined).success : false;
}
