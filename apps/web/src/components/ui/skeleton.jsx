
import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-pulse rounded-[var(--radius-md)] bg-muted/60", className)}
      {...props} />
  );
}

export { Skeleton }
