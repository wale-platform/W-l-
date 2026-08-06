"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronRight as Chevron } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------- Pagination -- */

/**
 * Builds a compact page list with ellipses:
 *   1 … 4 [5] 6 … 20
 * Always shows first, last, current, and one neighbour either side.
 */
function pageRange(current: number, total: number): Array<number | "gap"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < total) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "gap"> = [];

  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) out.push("gap");
    out.push(page);
  });

  return out;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const itemClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-field px-2 text-sm " +
    "transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Go to previous page"
        className={cn(itemClass, "text-ink-600 hover:bg-ink-100")}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>

      {pageRange(page, totalPages).map((item, i) =>
        item === "gap" ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="px-1 text-sm text-ink-400"
          >
            &hellip;
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-label={`Go to page ${item}`}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              itemClass,
              item === page
                ? "bg-brand-600 font-semibold text-white"
                : "text-ink-700 hover:bg-ink-100",
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Go to next page"
        className={cn(itemClass, "text-ink-600 hover:bg-ink-100")}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </nav>
  );
}

/* --------------------------------------------------------- Breadcrumbs -- */

export function Breadcrumbs({
  items,
  className,
}: {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;

          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded text-ink-500 transition-colors hover:text-brand-700"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-medium text-ink-900" : "text-ink-500"}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <Chevron aria-hidden="true" className="size-3.5 text-ink-300" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
