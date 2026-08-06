import type {
  HTMLAttributes,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Table primitives.
 *
 * `Table` wraps itself in a horizontally scrollable region so wide tables
 * degrade gracefully on mobile instead of blowing out the layout. The
 * wrapper is focusable (`tabIndex={0}`) because a scrollable region must
 * be reachable by keyboard to be operable — WCAG 2.1.1.
 */
export function Table({
  className,
  caption,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & { caption?: string }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={caption ?? "Data table"}
      className="overflow-x-auto rounded-card border border-ink-200"
    >
      <table className={cn("w-full border-collapse text-sm", className)} {...props}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {props.children}
      </table>
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-ink-50", className)} {...props} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-ink-100", className)} {...props} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-ink-50/60", className)} {...props} />;
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-600",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-ink-700", className)} {...props} />;
}
