import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const fieldBase =
  "w-full rounded-field border bg-white text-ink-900 placeholder:text-ink-400 " +
  "transition-colors duration-150 " +
  "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Renders inside the field on the leading edge — an icon, or a ₦ prefix. */
  leading?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leading, trailing, invalid, className, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        "h-11 px-3.5 text-sm",
        invalid
          ? "border-danger focus-visible:outline-danger"
          : "border-ink-200 hover:border-ink-300",
        leading && "pl-10",
        trailing && "pr-10",
        className,
      )}
      {...props}
    />
  );

  if (!leading && !trailing) return field;

  return (
    <div className="relative">
      {leading && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400"
        >
          {leading}
        </span>
      )}
      {field}
      {trailing && (
        <span className="absolute inset-y-0 right-2 flex items-center text-ink-400">
          {trailing}
        </span>
      )}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ invalid, className, rows = 5, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        "resize-y px-3.5 py-3 text-sm",
        invalid
          ? "border-danger focus-visible:outline-danger"
          : "border-ink-200 hover:border-ink-300",
        className,
      )}
      {...props}
    />
  );
});

/**
 * Wraps the native <select>. Deliberate: native gives us keyboard
 * navigation, type-ahead, mobile OS pickers, and screen-reader semantics
 * for free — all of which a custom listbox would have to re-earn.
 */
export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ invalid, className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          fieldBase,
          "h-11 appearance-none pl-3.5 pr-10 text-sm",
          invalid
            ? "border-danger focus-visible:outline-danger"
            : "border-ink-200 hover:border-ink-300",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 fill-none stroke-ink-500 stroke-2"
      >
        <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

export const Checkbox = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded-[0.25rem] border border-ink-300 " +
          "accent-brand-600 disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
});

export const Radio = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function Radio({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="radio"
      className={cn(
        "size-4 shrink-0 cursor-pointer border border-ink-300 " +
          "accent-brand-600 disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
});
