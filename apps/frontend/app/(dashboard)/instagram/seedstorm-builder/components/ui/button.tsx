import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 font-inter",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105 border border-primary/20 glow",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl border border-destructive/20",
        outline: "border-2 border-primary/50 bg-background/80 backdrop-blur text-foreground shadow-lg hover:bg-primary/20 hover:border-primary hover:shadow-xl hover:scale-105 hover:glow",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-lg border border-secondary/20",
        ghost: "hover:bg-primary/20 hover:text-primary text-muted-foreground hover:shadow-lg",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary p-0 h-auto",
        gradient: "bg-gradient-to-r from-destructive to-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 border border-destructive/30 glow",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl hover:scale-105 border border-accent/20",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-lg hover:shadow-xl border border-success/20",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-lg hover:shadow-xl border border-warning/20",
        hacker: "bg-card text-foreground border-2 border-primary/30 shadow-lg hover:border-primary hover:shadow-red-glow hover:bg-primary/10 transition-all duration-300 hacker-border",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 rounded px-4 text-xs",
        lg: "h-12 rounded px-10 text-base",
        xl: "h-14 rounded px-12 text-lg font-bold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
