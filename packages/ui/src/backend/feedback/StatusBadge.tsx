import { Badge } from "@mentio/ui/components/badge";

export type StatusTone = "neutral" | "waiting" | "success" | "danger";

// User decision 2026-10-31 (batch-2 proposal 3): weight follows the kind of state.
const variantByTone = {
  neutral: "secondary",
  waiting: "outline",
  success: "default",
  danger: "destructive",
} as const;

/** F6: a read-only status. The state → tone/label map lives with its concept. */
export function StatusBadge({ tone, label, className }: { tone: StatusTone; label: string; className?: string }) {
  return (
    <Badge variant={variantByTone[tone]} data-tone={tone} className={className}>
      {label}
    </Badge>
  );
}
