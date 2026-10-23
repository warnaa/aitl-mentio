import { cn } from "@mentio/ui/lib/utils";

export function LoadingMessage({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center gap-2 py-8 text-sm text-muted-foreground", className)}>
      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      {label}
    </div>
  );
}
