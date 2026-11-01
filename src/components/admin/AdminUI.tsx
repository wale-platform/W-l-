"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNaira } from "@/lib/utils/format";

/** Shared building blocks for the admin console pages. */

export const formatKobo = (kobo: number) => formatNaira(kobo / 100);

const dateTime = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" });
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDay = (iso: string) => dateOnly.format(new Date(iso));

export function AdminPageHeader({
  title,
  lead,
  actions,
}: {
  title: string;
  lead?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Admin</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
        {lead && <p className="mt-1 max-w-2xl text-sm text-ink-600">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const statTones = {
  brand: "bg-brand-50 text-brand-800",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof statTones;
  href?: string;
}) {
  const body = (
    <>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", statTones[tone])}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</span>
        <span className="mt-0.5 block truncate text-2xl font-extrabold tabular-nums text-ink-900">{value}</span>
        {hint && <span className="mt-0.5 block truncate text-xs text-ink-500">{hint}</span>}
      </span>
    </>
  );
  const className = "flex items-center gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm";
  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:border-brand-300")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-full bg-ink-100/70 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
            value === option.value ? "bg-white text-brand-800 shadow-sm" : "text-ink-600 hover:text-ink-900",
          )}
        >
          {option.label}
          {option.count !== undefined && <span className="ml-1.5 text-xs text-ink-400">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{placeholder}</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-ink-200 bg-white pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus-visible:outline-brand-600"
      />
    </label>
  );
}

export function Panel({ title, actions, children, className }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          {title && <h2 className="text-base font-bold text-ink-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm text-ink-500">{children}</p>;
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-ink-100" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-4 px-5 py-4">
          <div className="size-10 rounded-full bg-ink-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-ink-100" />
            <div className="h-3 w-1/2 rounded bg-ink-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The value, updated only after it stops changing for `delay` ms (for search boxes). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}
