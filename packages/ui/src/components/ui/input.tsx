import * as React from "react";
import { cn } from "@mentio/ui/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn("mentio-input", className)} {...props} />;
}
export { Input };
