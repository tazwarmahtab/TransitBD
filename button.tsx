import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-900 hover:shadow-lg transition-all duration-500 before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:via-primary-foreground/5 before:to-primary/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 overflow-hidden relative",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive-900 hover:shadow-lg transition-all duration-500 before:absolute before:inset-0 before:bg-gradient-to-r before:from-destructive/0 before:via-destructive-foreground/5 before:to-destructive/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 overflow-hidden relative",
        outline:
          "border-2 border-input bg-background hover:bg-accent/10 hover:text-accent-foreground hover:border-accent-foreground/40 transition-all duration-500",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary-600 hover:shadow-md transition-all duration-500 before:absolute before:inset-0 before:bg-gradient-to-r before:from-secondary/0 before:via-secondary-foreground/5 before:to-secondary/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 overflow-hidden relative",
        ghost: "hover:bg-accent/20 hover:text-accent-foreground transition-all duration-500",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/70 transition-all duration-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
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
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(
            buttonVariants({ variant, size, className }),
            "after:absolute after:inset-0 after:rounded-md after:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] after:transition-opacity after:duration-500 hover:after:opacity-0",
            "before:absolute before:inset-0 before:-z-10 before:rounded-md before:bg-gradient-to-r before:from-transparent before:via-primary/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:blur-xl before:transition-opacity before:duration-500",
            "transition-transform hover:translate-y-[1px] active:translate-y-[2px]"
          )}
          {...props}
        />
      )
    }

    return (
      <motion.button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size, className }),
          "after:absolute after:inset-0 after:rounded-md after:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] after:transition-opacity after:duration-500 hover:after:opacity-0",
          "before:absolute before:inset-0 before:-z-10 before:rounded-md before:bg-gradient-to-r before:from-transparent before:via-primary/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:blur-xl before:transition-opacity before:duration-500"
        )}
        whileHover={{ 
          y: 1,
          transition: { 
            duration: 0.5,
            ease: [0.32, 0.72, 0, 1]
          }
        }}
        whileTap={{ 
          y: 2,
          transition: {
            duration: 0.2,
            ease: [0.32, 0.72, 0, 1]
          }
        }}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }