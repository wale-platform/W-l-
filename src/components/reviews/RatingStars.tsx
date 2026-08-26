"use client";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Stars, for reading and for answering.
 *
 * `RatingStars` shows a score; `RatingInput` collects one. Both draw five stars, which
 * is where the similarity ends — reading a rating and giving one are different enough
 * that sharing an implementation would mean a display component carrying form state.
 *
 * A DISPLAYED SCORE IS NOT ROUNDED TO A WHOLE STAR. The verified average arrives with
 * one decimal, and 4.3 drawn as four stars is a different claim about somebody's home
 * than the one the data makes. So the gold row is clipped to the exact fraction and the
 * numeral is printed beside it — the glyphs are decoration, and every caller passes the
 * number itself to the accessible layer.
 *
 * There is no zero and no half-star affordance in the input. The server's floor is 1,
 * and an "N/A" option would produce averages taken over partly-answered questionnaires
 * that are not comparable between listings.
 */

const STARS = [1, 2, 3, 4, 5] as const;

const SIZES = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

/**
 * A score as five stars, clipped to the exact value.
 *
 * `aria-hidden` throughout: the glyphs say nothing a screen reader can use, and every
 * caller prints the number. Passing a label in here instead would put the same sentence
 * in two places and let them disagree.
 */
export function RatingStars({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  // Clamped rather than trusted: a malformed average must not paint outside the row.
  const fraction = Math.min(5, Math.max(0, value)) / 5;
  const glyph = SIZES[size];

  function row(tone: string) {
    return STARS.map((n) => (
      <Star key={n} className={cn(glyph, "shrink-0", tone)} />
    ));
  }

  return (
    <span aria-hidden="true" className={cn("relative inline-flex w-fit", className)}>
      <span className="inline-flex gap-0.5">{row("text-ink-200")}</span>
      {/* The gold layer, cut to the score. `shrink-0` on the glyphs matters: without
          it the stars would compress to fit the narrowed box instead of being clipped
          by it, and 4.3 would render as five slightly thin stars. */}
      <span
        className="absolute inset-y-0 left-0 inline-flex gap-0.5 overflow-hidden"
        style={{ width: `${fraction * 100}%` }}
      >
        {row("fill-sand-500 text-sand-500")}
      </span>
    </span>
  );
}

/**
 * One score, answered.
 *
 * Real `<input type="radio">` elements, visually hidden behind the star glyphs. That is
 * worth the extra markup: a native radio group gives arrow-key navigation, roving focus
 * and the right announcement for free, where a row of buttons wearing `role="radio"`
 * would need all three implemented by hand and would get one of them wrong.
 *
 * The `<legend>` is `sr-only` with a visible `aria-hidden` copy beside it. A legend has
 * to be the fieldset's first child to caption it, and a visible one cannot then be laid
 * out beside the stars — so the accessible name and the visible text are two elements
 * saying the same string, rather than a group with no name at all.
 */
export function RatingInput({
  name,
  legend,
  hint,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  hint: string;
  /** Undefined until they answer — which is what makes the schema's message appear. */
  value?: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  const errorId = `${name}-error`;

  return (
    <fieldset className="grid gap-2 border-b border-ink-100 py-3 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center">
      <legend className="sr-only">{legend}</legend>

      <div className="flex flex-col">
        <span aria-hidden="true" className="text-sm font-medium text-ink-800">
          {legend}
        </span>
        <span className="text-xs text-ink-500">{hint}</span>
      </div>

      <div className="flex items-center gap-1">
        {STARS.map((n) => (
          <label key={n} className="cursor-pointer rounded p-0.5">
            <input
              type="radio"
              name={name}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              // `aria-describedby` and not `aria-invalid`: ARIA defines the latter on
              // `radiogroup`, not on `radio`, so putting it here would be ignored at
              // best. The error text below is `role="alert"` and is pointed at from
              // every star, which is what actually reaches a screen reader.
              aria-describedby={error ? errorId : undefined}
              className="peer sr-only"
            />
            <Star
              aria-hidden="true"
              className={cn(
                "size-7 rounded transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 sm:size-6",
                value !== undefined && value >= n
                  ? "fill-sand-500 text-sand-500"
                  : "text-ink-300 hover:text-sand-400",
              )}
            />
            {/* The radio's label. "3" alone is announced without a scale. */}
            <span className="sr-only">{`${n} out of 5`}</span>
          </label>
        ))}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger sm:col-span-2">
          {error}
        </p>
      )}
    </fieldset>
  );
}
