import type { HTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ------------------------------------------------------------- Spinner -- */

export function Spinner({
  size = "md",
  label = "Loading",
  className,
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const dims = { sm: "size-4", md: "size-6", lg: "size-9" };

  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      <Loader2
        aria-hidden="true"
        className={cn("animate-spin text-brand-600", dims[size])}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------ Skeleton -- */

/**
 * Placeholder block for loading states.
 *
 * `aria-hidden` throughout: screen readers should hear the region's
 * `aria-busy` state, not a stream of meaningless empty boxes.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-ink-100", className)}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------- EmptyState -- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card " +
          "border border-dashed border-ink-200 bg-ink-50/50 px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-white text-ink-400 shadow-card"
        >
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-ink-900">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-ink-500">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------- ErrorState -- */

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this right now. Please try again.",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card " +
          "border border-danger/20 bg-danger-subtle px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-danger">{title}</p>
        <p className="mx-auto max-w-sm text-sm text-ink-700">{description}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
