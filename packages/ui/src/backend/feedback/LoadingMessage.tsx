import { cn } from "@mentio/ui/lib/utils";

export function LoadingMessage({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("mentio-loading", className)}>
      <span className="mentio-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
