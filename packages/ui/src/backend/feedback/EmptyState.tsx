import type { ReactNode } from "react";
import { cn } from "@mentio/ui/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mentio-empty-state", className)}>
      <p className="mentio-empty-state-title">{title}</p>
      {description && <p className="mentio-empty-state-description">{description}</p>}
      {action && <div className="mentio-feedback-action">{action}</div>}
    </div>
  );
}
