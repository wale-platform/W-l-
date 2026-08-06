"use client";

import { useId, useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Input, type InputProps } from "./Input";

export function Label({
  children,
  required,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("text-sm font-medium text-ink-800", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

interface FieldRenderProps {
  id: string;
  "aria-describedby": string | undefined;
  invalid: boolean;
}

/**
 * Label + control + hint + error, with the ARIA wiring done once.
 *
 * `children` is a function so the generated id and `aria-describedby`
 * reach the actual control — cloneElement would be fragile across the
 * different control shapes (input, select, textarea, custom).
 *
 *   <FormField label="Email" error={errors.email?.message}>
 *     {(field) => <Input {...field} {...register("email")} />}
 *   </FormField>
 */
export function FormField({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: FieldRenderProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>

      {children({ id, "aria-describedby": describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-500">
          {hint}
        </p>
      )}

      {/* `role="alert"` so the message is announced when validation fires. */}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Password field with a visibility toggle.
 *
 * The toggle is a real button so it is reachable by keyboard, and its
 * accessible name changes with state rather than relying on the icon.
 */
export const PasswordInput = function PasswordInput(
  props: Omit<InputProps, "type" | "trailing">,
) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="rounded p-1.5 text-ink-500 transition-colors hover:text-ink-800"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      }
    />
  );
};
