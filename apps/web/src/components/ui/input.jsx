
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, icon: Icon, iconPosition = 'left', ...props }, ref) => {
  return (
    <div className="relative w-full">
      {Icon && iconPosition === 'left' && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[var(--radius-md)] border border-input bg-background px-4 py-2 text-sm text-foreground shadow-soft-sm transition-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          Icon && iconPosition === 'left' ? "pl-10" : "",
          Icon && iconPosition === 'right' ? "pr-10" : "",
          className
        )}
        ref={ref}
        {...props}
      />
      {Icon && iconPosition === 'right' && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
})
Input.displayName = "Input"

export { Input }
