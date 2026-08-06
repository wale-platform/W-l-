import { cn } from "@/lib/utils/cn";
import { siteConfig } from "@/config/site";

/**
 * WALE brand mark.
 *
 * The glyph is hand-authored inline SVG rather than an imported asset:
 * it scales crisply at every size, costs no network request or layout
 * shift, and can be recoloured per surface. The wordmark is real HTML
 * text (not SVG paths) so it stays selectable, accessible, and rendered
 * in the loaded Geist face.
 *
 * To swap in the official asset later, replace `LogoMark` below — no
 * other file references the artwork.
 */

type Tone = "color" | "mono" | "inverse";

const glyphTones: Record<Tone, { dark: string; light: string; window: string }> = {
  // Two-tone green, matching the source mark.
  color: { dark: "fill-brand-950", light: "fill-brand-500", window: "fill-white" },
  // Single-colour, inherits text colour — for dense or monochrome contexts.
  mono: { dark: "fill-current", light: "fill-current", window: "fill-white" },
  // For placement on dark brand backgrounds.
  inverse: { dark: "fill-white", light: "fill-brand-300", window: "fill-brand-950" },
};

export function LogoMark({
  className,
  tone = "color",
}: {
  className?: string;
  tone?: Tone;
}) {
  const t = glyphTones[tone];

  return (
    <svg
      viewBox="0 0 64 64"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={cn("h-9 w-9 shrink-0", className)}
    >
      {/* Left tower — taller, darker, angled roofline rising to the centre. */}
      <path d="M6 58V25.5L29 6v52H6Z" className={t.dark} />
      {/* Right tower — shorter, lighter, squared off. */}
      <path d="M32 58V18l26 0v40H32Z" className={t.light} />
      {/* Window cutouts on the right tower: two columns, three rows. */}
      <g className={t.window}>
        <rect x="38" y="25" width="6" height="6" rx="1" />
        <rect x="48" y="25" width="6" height="6" rx="1" />
        <rect x="38" y="36" width="6" height="6" rx="1" />
        <rect x="48" y="36" width="6" height="6" rx="1" />
      </g>
      {/* Doorway in the left tower, reading as the entrance to the home. */}
      <path d="M14 58V44a5 5 0 0 1 10 0v14h-10Z" className={t.window} />
    </svg>
  );
}

export function Logo({
  variant = "full",
  tone = "color",
  className,
}: {
  /** `mark` = glyph only · `full` = glyph + wordmark · `stacked` = full lockup */
  variant?: "mark" | "full" | "stacked";
  tone?: Tone;
  className?: string;
}) {
  const wordTone = tone === "inverse" ? "text-white" : "text-brand-950";
  const subTone = tone === "inverse" ? "text-brand-200" : "text-brand-600";

  if (variant === "mark") {
    return (
      <span className={cn("inline-flex", className)}>
        <LogoMark tone={tone} />
        <span className="sr-only">{siteConfig.name}</span>
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center gap-3", className)}>
        <LogoMark tone={tone} className="h-16 w-16" />
        <span className="flex flex-col items-center">
          <span
            className={cn(
              "text-2xl font-semibold uppercase leading-none tracking-[0.28em]",
              wordTone,
            )}
          >
            {siteConfig.shortName}
          </span>
          <span
            className={cn(
              "mt-1.5 text-[0.6rem] font-medium uppercase tracking-[0.42em]",
              subTone,
            )}
          >
            Housing
          </span>
          <span className={cn("mt-2 text-sm", tone === "inverse" ? "text-brand-100" : "text-ink-500")}>
            {siteConfig.tagline}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-lg font-semibold uppercase tracking-[0.2em]",
            wordTone,
          )}
        >
          {siteConfig.shortName}
        </span>
        <span
          className={cn(
            "mt-1 text-[0.5rem] font-medium uppercase tracking-[0.34em]",
            subTone,
          )}
        >
          Housing
        </span>
      </span>
    </span>
  );
}
