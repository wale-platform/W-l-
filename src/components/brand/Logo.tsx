import { cn } from "@/lib/utils/cn";
import { siteConfig } from "@/config/site";

type Tone = "color" | "mono" | "inverse";

const glyphTones: Record<
  Tone,
  { dark: string; light: string; window: string; background: string }
> = {
  color: {
    dark: "fill-white",
    light: "fill-white",
    window: "fill-brand-800",
    background: "fill-brand-800",
  },
  mono: {
    dark: "fill-current",
    light: "fill-current",
    window: "fill-white",
    background: "fill-transparent",
  },
  inverse: {
    dark: "fill-white",
    light: "fill-white",
    window: "fill-brand-950",
    background: "fill-transparent",
  },
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
      <rect x="2" y="2" width="60" height="60" rx="10" className={t.background} />
      <path d="M6 58V25.5L29 6v52H6Z" className={t.dark} />
      <path d="M32 58V18l26 0v40H32Z" className={t.light} />
      <g className={t.window}>
        <rect x="38" y="25" width="6" height="6" rx="1" />
        <rect x="48" y="25" width="6" height="6" rx="1" />
        <rect x="38" y="36" width="6" height="6" rx="1" />
        <rect x="48" y="36" width="6" height="6" rx="1" />
      </g>
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
  const wordTone =
    tone === "color" || tone === "inverse" ? "text-white" : "text-current";
  const displayTone = tone === "color" ? "inverse" : tone;
  const lockupTone =
    tone === "color" ? "rounded-field bg-brand-800 px-2.5 py-1.5" : "";

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
      <span className={cn("inline-flex flex-col items-center gap-3", lockupTone, className)}>
        <LogoMark tone={displayTone} className="h-16 w-16" />
        <span className="flex flex-col items-center">
          <span className={cn("text-2xl font-semibold uppercase leading-none tracking-[0.28em]", wordTone)}>
            {siteConfig.shortName}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", lockupTone, className)}>
      <LogoMark tone={displayTone} className="h-10 w-10" />
      <span className="leading-none">
        <span
          className={cn(
            "text-xl font-bold uppercase tracking-[0.15em]",
            wordTone,
          )}
        >
          {siteConfig.shortName}
        </span>
      </span>
    </span>
  );
}
