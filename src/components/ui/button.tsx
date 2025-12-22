import * as React from "react";
import { clsx } from "clsx";

type Variant = "default" | "outline" | "ghost" | "secondary" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variantClass: Record<Variant, string> = {
  default: "bg-black text-white hover:bg-zinc-800",
  outline: "border border-zinc-200 hover:bg-zinc-50 text-zinc-900",
  ghost: "hover:bg-zinc-100 text-zinc-900",
  secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

const sizeClass: Record<Size, string> = {
  sm: "h-8 px-2.5",
  md: "h-9 px-3",
  lg: "h-10 px-4",
  icon: "h-9 w-9",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant = "default", size = "md", loading, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(base, variantClass[variant], sizeClass[size], className)}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
