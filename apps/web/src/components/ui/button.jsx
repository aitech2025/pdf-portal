
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft-md hover:shadow-soft-lg hover:bg-primary/90 hover:-translate-y-0.5",
        gradient:
          "bg-gradient-primary text-primary-foreground shadow-soft-md hover:shadow-soft-lg hover:opacity-90 hover:-translate-y-0.5 border-none",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft-sm hover:bg-destructive/90 hover:shadow-soft-md",
        outline:
          "border border-input bg-background shadow-soft-sm hover:bg-accent hover:text-accent-foreground hover:border-accent/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-soft-sm hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-12 rounded-[var(--radius-lg)] px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, isLoading = false, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Comp>
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
