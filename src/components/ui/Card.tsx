import type { HTMLAttributes, ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { variants } from "@/lib/utils/variants";

/* ---------------------------------------------------------------- Card -- */

export function Card({
  className,
  interactive,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border border-ink-200 bg-white shadow-card",
        interactive &&
          "transition-shadow duration-200 ease-out-soft hover:shadow-lifted",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-ink-900", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-ink-500", className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 border-t border-ink-100 p-5", className)}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- Badge -- */

const badge = variants(
  "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
  {
    tone: {
      neutral: "bg-ink-100 text-ink-700",
      brand: "bg-brand-50 text-brand-800",
      success: "bg-success-subtle text-success",
      warning: "bg-warning-subtle text-warning",
      danger: "bg-danger-subtle text-danger",
      info: "bg-info-subtle text-info",
      outline: "border border-ink-200 bg-white text-ink-700",
    },
    size: {
      sm: "px-2 py-0.5 text-[0.6875rem]",
      md: "px-2.5 py-1 text-xs",
    },
  },
  { tone: "neutral", size: "md" },
);

export function Badge({
  tone,
  size,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "outline";
  size?: "sm" | "md";
}) {
  return <span className={badge({ tone, size, className })} {...props} />;
}

/**
 * The trust signal that carries WALE's core promise. Split out from
 * `Badge` so the copy and icon stay identical everywhere it appears.
 */
export function VerifiedBadge({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Badge tone="success" size={size} className={className}>
      <BadgeCheck aria-hidden="true" className="size-3.5" />
      Verified
    </Badge>
  );
}

/* -------------------------------------------------------------- Avatar -- */

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-base" };

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full " +
          "bg-brand-100 font-semibold text-brand-800",
        dims[size],
        className,
      )}
    >
      {src ? (
        // Avatars come from arbitrary user-supplied URLs, so this stays a
        // plain <img> rather than next/image (no remotePatterns entry needed).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}

/* --------------------------------------------------------------- Alert -- */

const alertTones = {
  info: "border-info/25 bg-info-subtle text-info",
  success: "border-success/25 bg-success-subtle text-success",
  warning: "border-warning/25 bg-warning-subtle text-warning",
  danger: "border-danger/25 bg-danger-subtle text-danger",
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  icon,
  className,
}: {
  tone?: keyof typeof alertTones;
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      // Errors interrupt; everything else waits for a pause in speech.
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-field border p-4 text-sm",
        alertTones[tone],
        className,
      )}
    >
      {icon && (
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          {icon}
        </span>
      )}
      <div className="flex flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink-700">{children}</div>}
      </div>
    </div>
  );
}
