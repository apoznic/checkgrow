import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Button variants follow the CheckGrow design system: 8px radius, weight 600,
// 150ms colour transitions, periwinkle focus ring with 2px offset.
const glassButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Secondary: neutral fill with hairline border
        default: "bg-secondary text-foreground border border-border hover:bg-[#ECECE9]",
        secondary: "bg-secondary text-foreground border border-border hover:bg-[#ECECE9]",
        // Primary CTA: dark fill on the light canvas
        primary: "bg-[#2A2722] text-[#F7F7F5] hover:bg-[#3F3F47]",
        // Accent CTA: periwinkle, use sparingly
        accent: "bg-primary text-white hover:bg-[#8A96F0]",
        ghost: "bg-transparent text-foreground hover:bg-secondary",
        outline: "border border-border bg-transparent text-foreground hover:bg-secondary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-[#C0252A]",
        link: "text-accent-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 text-[0.9375rem]",
        sm: "h-8 px-3 text-[0.8125rem]",
        lg: "h-12 px-7 text-base",
        xl: "h-14 px-8 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const GlassButtonNew = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(glassButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

GlassButtonNew.displayName = "GlassButtonNew";

export { GlassButtonNew, glassButtonVariants };
