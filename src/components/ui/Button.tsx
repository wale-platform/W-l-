import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { variants } from "@/lib/utils/variants";

const button = variants(
  "inline-flex items-center justify-center gap-2 rounded-field font-medium whitespace-nowrap " +
    "transition-colors duration-150 ease-out-soft " +
    "disabled:pointer-events-none disabled:opacity-55",
  {
    tone: {
      primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
      secondary:
        "bg-brand-50 text-brand-800 hover:bg-brand-100 active:bg-brand-200",
      outline:
        "border border-ink-200 bg-white text-ink-800 hover:bg-ink-50 hover:border-ink-300",
      ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
      danger: "bg-danger text-white hover:brightness-95 active:brightness-90",
    },
    size: {
      sm: "h-9 px-3.5 text-sm",
      md: "h-11 px-5 text-sm",
      lg: "h-12 px-6 text-base",
    },
    block: {
      true: "w-full",
      false: "",
    },
  },
  { tone: "primary", size: "md", block: "false" },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  isLoading?: boolean;
  /** Shown in place of children while loading, for screen readers and sighted users alike. */
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    tone,
    size,
    block,
    isLoading = false,
    loadingText,
    disabled,
    className,
    children,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      // A loading button stays focusable but is not actionable; `aria-busy`
      // tells assistive tech why, which `disabled` alone would not.
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={button({
        tone,
        size,
        block: block ? "true" : "false",
        className,
      })}
      {...props}
    >
      {isLoading && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
});
