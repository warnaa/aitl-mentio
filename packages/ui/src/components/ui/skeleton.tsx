import { cn } from "cn"

// User decision: static placeholder shapes (no pulse). Decorative by default; the
// surrounding region announces loading with aria-busy and a status text (WAI-ARIA).
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("mentio-skeleton", className)}
      {...props}
    />
  )
}

export { Skeleton }
