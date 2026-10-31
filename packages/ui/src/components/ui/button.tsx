import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@mentio/ui/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "mentio-button",
  {
    variants: {
      variant: {
        default: "mentio-button-primary",
        destructive: "mentio-button-destructive",
        outline: "mentio-button-outline",
        secondary: "mentio-button-secondary",
        ghost: "mentio-button-ghost",
        link: "mentio-button-link",
      },
      size: {
        default: "mentio-button-default",
        xs: "mentio-button-xs",
        sm: "mentio-button-sm",
        lg: "mentio-button-lg",
        icon: "mentio-button-icon",
        "icon-xs": "mentio-button-icon-xs",
        "icon-sm": "mentio-button-icon-sm",
        "icon-lg": "mentio-button-icon-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
