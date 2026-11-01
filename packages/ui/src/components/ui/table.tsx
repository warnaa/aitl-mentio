"use client"

import * as React from "react"
import { cn } from "@mentio/ui/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isScrollable, setIsScrollable] = React.useState(false)
  // User decision 2026-11-01 (WCAG 2.1.1): a container that scrolls sideways must be reachable by keyboard
  // even when no cell holds a link. It becomes a focusable region, named like the table, only while it
  // overflows. ResizeObserver reports once on observe, then on every size change of the box or the table.
  React.useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => setIsScrollable(container.scrollWidth > container.clientWidth))
    observer.observe(container)
    observer.observe(container.firstElementChild as Element)
    return () => observer.disconnect()
  }, [])
  const name = props["aria-label"] ?? props["aria-labelledby"]
  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      className="mentio-table-container"
      {...(isScrollable && {
        tabIndex: 0,
        role: name ? "region" : undefined,
        "aria-label": props["aria-label"],
        "aria-labelledby": props["aria-labelledby"],
      })}
    >
      <table
        data-slot="table"
        className={cn("mentio-table", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("mentio-table-header", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("mentio-table-body", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("mentio-table-footer", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("mentio-table-row", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("mentio-table-head", className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("mentio-table-cell", className)}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mentio-table-caption", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
