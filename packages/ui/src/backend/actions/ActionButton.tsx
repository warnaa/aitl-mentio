"use client";

import { useId, useRef, useState, type ComponentProps, type MouseEvent } from "react";
import { Button } from "@mentio/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@mentio/ui/components/alert-dialog";
import type { ApiErrorBody, ApiResult } from "../api/types";

export interface ActionConfirm {
  /** A question naming the object, e.g. "Remove the slot on 6 November at 18:00?". */
  title: string;
  /** The consequence, e.g. the refund amount. */
  description: string;
  /** Verb and object, e.g. "Remove slot" — never "OK". */
  confirmLabel: string;
  /** What is kept, e.g. "Keep slot". */
  cancelLabel: string;
}

export interface ActionButtonProps {
  label: string;
  /** Shown while the request runs; defaults to the label. */
  pendingLabel?: string;
  run: () => Promise<ApiResult<unknown>>;
  confirm?: ActionConfirm;
  onSuccess?: (data: unknown) => void;
  onError?: (error: ApiErrorBody) => void;
  disabled?: boolean;
  /** Visible explanation when `disabled` (task: no disabled button without a reason). */
  disabledReason?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
}

/**
 * Runs one server action (F5): optional confirmation, a synchronous guard against a
 * second run while busy, an inline `role="alert"` failure and callbacks once per run.
 */
export function ActionButton({
  label,
  pendingLabel,
  run,
  confirm,
  onSuccess,
  onError,
  disabled = false,
  disabledReason,
  variant,
  size,
}: ActionButtonProps) {
  const id = useId();
  const busy = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reasonId = `${id}-reason`;
  const errorId = `${id}-error`;

  async function execute() {
    if (busy.current) return;
    busy.current = true;
    setIsPending(true);
    setError(null);
    const result = await run();
    busy.current = false;
    setIsPending(false);
    setIsConfirming(false);
    if (result.ok) {
      onSuccess?.(result.data);
      return;
    }
    setError(result.error.message);
    onError?.(result.error);
  }

  function handleClick() {
    // A pending button stays focusable (aria-disabled) so focus is not lost mid-request.
    if (busy.current) return;
    if (confirm) setIsConfirming(true);
    else void execute();
  }

  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // Keep the dialog open while the request runs; it closes once the result is known.
    event.preventDefault();
    void execute();
  }

  const describedBy = [disabled && disabledReason ? reasonId : undefined, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className="mentio-action">
      <Button
        ref={buttonRef}
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        aria-disabled={isPending || undefined}
        aria-busy={isPending || undefined}
        aria-describedby={describedBy}
        onClick={handleClick}
      >
        {isPending && !confirm ? (pendingLabel ?? label) : label}
      </Button>
      {disabled && disabledReason && (
        <p id={reasonId} className="mentio-field-description">
          {disabledReason}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mentio-field-error">
          {error}
        </p>
      )}
      {confirm && (
        <AlertDialog open={isConfirming} onOpenChange={(open) => !busy.current && setIsConfirming(open)}>
          <AlertDialogContent
            onCloseAutoFocus={(event) => {
              // WAI-ARIA: focus returns to the button that opened the dialog.
              event.preventDefault();
              buttonRef.current?.focus();
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>{confirm.cancelLabel}</AlertDialogCancel>
              <AlertDialogAction variant={variant ?? "default"} aria-disabled={isPending || undefined} aria-busy={isPending || undefined} onClick={handleConfirm}>
                {isPending ? (pendingLabel ?? confirm.confirmLabel) : confirm.confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
