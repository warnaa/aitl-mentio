import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@mentio/ui/lib/utils"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  "mentio-badge",
  {
    variants: {
      variant: {
        default: "mentio-badge-primary",
        secondary: "mentio-badge-secondary",
        destructive: "mentio-badge-destructive",
        outline: "mentio-badge-outline",
        ghost: "mentio-badge-ghost",
        link: "mentio-badge-link",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
