"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// BUTTON VARIANTS & SIZES
// ============================================

const buttonVariants = cva(
  // Base styles - shared across all variants
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-evergreen focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary - Brandy (Cognac) gradient (main CTA)
        primary:
          "bg-gradient-to-r from-[#1e3d32] to-[#2a5244] text-paper hover:from-[#2a5244] hover:to-[#356152] hover:shadow-lg hover:shadow-evergreen/25 active:scale-[0.98]",

        // Secondary - Ink
        secondary:
          "bg-ink text-paper hover:bg-[#292524] hover:shadow-lg hover:shadow-ink/25 active:scale-[0.98]",

        // Outline - Brandy border
        outline:
          "border-2 border-evergreen bg-transparent text-evergreen hover:bg-evergreen hover:text-paper active:scale-[0.98]",

        // Outline Ink - Ink border (for light backgrounds)
        "outline-navy":
          "border-2 border-ink bg-transparent text-ink hover:bg-ink hover:text-paper active:scale-[0.98]",

        // Ghost - subtle hover effect
        ghost:
          "hover:bg-ink/5 text-ink dark:text-paper dark:hover:bg-paper/10",

        // Danger - Red for destructive actions
        danger:
          "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/25 active:scale-[0.98]",

        // Link - looks like a link
        link:
          "text-evergreen underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-4 py-2 text-sm rounded-lg",
        md: "h-11 px-6 py-2.5 text-base",
        lg: "h-14 px-8 py-3 text-lg",
        icon: "h-10 w-10 p-2",
        "icon-sm": "h-8 w-8 p-1.5",
        "icon-lg": "h-12 w-12 p-2.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// ============================================
// BUTTON PROPS INTERFACE
// ============================================

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child component (e.g., Link) */
  asChild?: boolean;
  /** Show loading spinner */
  isLoading?: boolean;
  /** Loading text (defaults to children) */
  loadingText?: string;
  /** Custom loader component */
  loader?: React.ReactNode;
}

// ============================================
// BUTTON COMPONENT
// ============================================

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild = false,
      isLoading = false,
      loadingText,
      loader,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    
    // Default loader with Spinner
    const defaultLoader = (
      <Loader2 className="h-4 w-4 animate-spin" />
    );
    
    const isDisabled = disabled || isLoading;
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            {loader || defaultLoader}
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

// ============================================
// EXPORTS
// ============================================

export { Button, buttonVariants };
export default Button;
