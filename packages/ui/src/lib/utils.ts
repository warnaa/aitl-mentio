// shadcn's `cn` package (drop-in for clsx + tailwind-merge). The shadcn CLI imports it
// directly; this re-export keeps `@mentio/ui/lib/utils` working for our own code.
export { cn, type ClassValue } from "cn";
