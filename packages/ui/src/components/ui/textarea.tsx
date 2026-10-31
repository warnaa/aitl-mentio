import * as React from "react";
import { cn } from "@mentio/ui/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn("mentio-textarea", className)} {...props} />;
}
export { Textarea };
