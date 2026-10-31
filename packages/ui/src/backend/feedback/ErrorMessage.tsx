import { Button } from "@mentio/ui/components/button";
import { cn } from "@mentio/ui/lib/utils";

export function ErrorMessage({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("mentio-error-message", className)}>
      <p className="mentio-error-message-title">{title}</p>
      <p className="mentio-error-message-text">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mentio-feedback-action" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
