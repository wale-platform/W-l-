import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Horizontal page gutter and max width. Every section uses this so the
 * content column stays aligned across pages.
 */
export function Container({
  as: Tag = "div",
  size = "default",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  size?: "default" | "narrow" | "wide";
}) {
  const widths = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  };

  return (
    <Tag
      className={cn("mx-auto w-full px-5 sm:px-6 lg:px-8", widths[size], className)}
      {...props}
    />
  );
}

/**
 * Vertical rhythm between page sections, kept consistent in one place.
 */
export function Section({
  as: Tag = "section",
  spacing = "default",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  spacing?: "default" | "tight" | "loose";
}) {
  const pads = {
    tight: "py-12 sm:py-16",
    default: "py-16 sm:py-20 lg:py-24",
    loose: "py-20 sm:py-28 lg:py-32",
  };

  return <Tag className={cn(pads[spacing], className)} {...props} />;
}

/**
 * Eyebrow + heading + optional lead paragraph. Repeated at the top of
 * most marketing sections.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "center" | "left";
  as?: ElementType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
          {eyebrow}
        </span>
      )}
      <Tag className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
        {title}
      </Tag>
      {lead && <p className="text-base leading-7 text-ink-600">{lead}</p>}
    </div>
  );
}
