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
    <div className={cn("flex flex-col items-center gap-1 py-10 text-center text-sm", className)}>
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
