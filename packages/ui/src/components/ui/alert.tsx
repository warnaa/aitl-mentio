import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const alertVariants = cva("mentio-alert", {
  variants: {
    variant: {
      default: "mentio-alert-default",
      destructive: "mentio-alert-destructive",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("mentio-alert-title", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("mentio-alert-description", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
