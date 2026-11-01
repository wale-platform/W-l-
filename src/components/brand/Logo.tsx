import { cn } from "@/lib/utils/cn";
import { siteConfig } from "@/config/site";

type Tone = "color" | "mono" | "inverse";

/**
 * The mark has no background tile: the windows and door are cut out of the
 * buildings (`evenodd`), so whatever sits behind the logo shows through.
 */
const toneClasses: Record<Tone, { mark: string; word: string }> = {
  color: { mark: "fill-brand-800", word: "text-brand-800" },
  mono: { mark: "fill-current", word: "text-current" },
  inverse: { mark: "fill-white", word: "text-white" },
};

const LEFT_BUILDING = "M6 58V25.5L29 6v52H6Z M14 58V44a5 5 0 0 1 10 0v14H14Z";
const RIGHT_BUILDING =
  "M32 58V18h26v40H32Z " +
  "M38 25h6v6h-6Z M48 25h6v6h-6Z M38 36h6v6h-6Z M48 36h6v6h-6Z";

export function LogoMark({
  className,
  tone = "color",
}: {
  className?: string;
  tone?: Tone;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={cn("h-9 w-9 shrink-0", toneClasses[tone].mark, className)}
    >
      <path d={LEFT_BUILDING} fillRule="evenodd" />
      <path d={RIGHT_BUILDING} fillRule="evenodd" />
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
  const wordTone = toneClasses[tone].word;

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
          <span className={cn("text-2xl font-semibold uppercase leading-none tracking-[0.28em]", wordTone)}>
            {siteConfig.shortName}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark tone={tone} className="h-10 w-10" />
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
