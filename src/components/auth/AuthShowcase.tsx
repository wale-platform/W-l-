import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { BadgeCheck, CalendarCheck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Left-hand panel of the auth pages: a headline and a playful collage of
 * listing cards, app snippets and floating 3D emoji (Fluent Emoji 3D,
 * MIT — see public/emoji/LICENSE.md), in the spirit of facebook.com's
 * login page. Purely decorative apart from the headline, so the collage
 * is hidden from assistive technology.
 */

type Emoji =
  | "house"
  | "key"
  | "sparkles"
  | "heart"
  | "party"
  | "thumbs-up"
  | "graduation-cap"
  | "star-struck"
  | "check"
  | "pin";

function Sticker({
  emoji,
  size,
  className,
  rotate = 0,
  delay = 0,
  slow = false,
}: {
  emoji: Emoji;
  size: number;
  className?: string;
  rotate?: number;
  delay?: number;
  slow?: boolean;
}) {
  return (
    <Image
      src={`/emoji/${emoji}.png`}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      className={cn(
        "pointer-events-none absolute select-none drop-shadow-[0_10px_14px_rgba(86,16,39,0.22)]",
        slow ? "animate-float-slow" : "animate-float",
        className,
      )}
      style={{ "--float-rotate": `${rotate}deg`, animationDelay: `${delay}s` } as CSSProperties}
    />
  );
}

function PhotoCard({
  src,
  className,
  children,
}: {
  src: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute overflow-hidden rounded-[1.75rem] border-[6px] border-white bg-white shadow-[0_24px_60px_-12px_rgba(86,16,39,0.35)]",
        className,
      )}
    >
      <Image src={src} alt="" fill sizes="(min-width: 1280px) 300px, 26vw" className="object-cover" />
      {children}
    </div>
  );
}

export function AuthShowcase() {
  return (
    <div className="flex h-full w-full max-w-[540px] flex-col gap-[clamp(1rem,3.5vh,2.5rem)]">
      <div className="shrink-0 space-y-[clamp(0.5rem,1.6vh,1rem)]">
        <p className="w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-800 shadow-sm">
          Homes, without hassle
        </p>
        <h2 className="text-[clamp(1.75rem,4.6vh,3rem)] font-extrabold leading-[1.1] tracking-tight text-ink-900">
          Your next home is <span className="text-brand-800">closer than you think.</span>
        </h2>
        <p className="max-w-md text-[clamp(0.875rem,1.9vh,1rem)] leading-relaxed text-ink-600 [@media(max-height:680px)]:hidden">
          Verified rooms, flats and self-contains near Nigerian universities — with real
          prices and a named contact for every home.
        </p>
      </div>

      {/* Takes the remaining height; the collage keeps its shape and fits
          whichever is tighter, the width or the height (container units). */}
      <div className="relative min-h-0 flex-1 [container-type:size]">
        <div className="absolute inset-0 flex items-center justify-center">
          <ShowcaseCollage className="w-[min(100cqw,calc(100cqh/0.86))]" />
        </div>
      </div>
    </div>
  );
}

/**
 * The card-and-sticker collage on its own, reused by the home page hero.
 */
export function ShowcaseCollage({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative aspect-[1/0.86] w-full", className)}>
        {/* Back card */}
        <PhotoCard src="/listings/listing-04.jpg?v=2" className="left-[2%] top-[6%] h-[64%] w-[56%] -rotate-[7deg]">
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-transparent p-4 pt-12 text-white">
            <p className="text-sm font-bold">Self-contained · Tanke</p>
            <p className="mt-0.5 text-xs text-white/80">₦280,000 / year</p>
          </div>
        </PhotoCard>

        {/* Front card */}
        <PhotoCard src="/listings/listing-11.jpg?v=2" className="right-[2%] top-[18%] h-[60%] w-[50%] rotate-[5deg]">
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-success shadow">
            <BadgeCheck className="size-3.5" /> Verified
          </span>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-transparent p-4 pt-12 text-white">
            <p className="text-sm font-bold">2 bedroom flat · Fate</p>
            <p className="mt-0.5 text-xs text-white/80">₦550,000 / year</p>
          </div>
        </PhotoCard>

        {/* "Near campus" pill */}
        <div className="absolute right-[6%] top-[2%] flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-lifted">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-50">
            <MapPin className="size-4 text-brand-800" />
          </span>
          <span className="text-xs font-semibold text-ink-800">5 min walk to campus</span>
        </div>

        {/* Inspection notification */}
        <div className="absolute bottom-[1%] left-[0%] flex w-[56%] items-center gap-3 rounded-2xl bg-white p-3 pr-4 shadow-[0_18px_40px_-12px_rgba(86,16,39,0.35)]">
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            <Image src="/emoji/key.png" alt="" width={30} height={30} sizes="30px" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
              <CalendarCheck className="size-4 text-success" /> Inspection booked
            </span>
            <span className="mt-0.5 block truncate text-xs text-ink-500">Sat, 10:00 AM · Oke-Odo, Tanke</span>
          </span>
          <span className="size-2.5 shrink-0 rounded-full bg-success ring-4 ring-success/15" />
        </div>

        {/* Chat bubble */}
        <div className="absolute bottom-[3%] right-[0%] max-w-[40%] rounded-2xl rounded-br-md bg-brand-800 px-3.5 py-2.5 text-xs font-medium leading-5 text-white shadow-[0_14px_30px_-10px_rgba(86,16,39,0.6)]">
          Yes, it&apos;s still available! Come see it Saturday.
        </div>

        {/* 3D emoji */}
        <Sticker emoji="house" size={92} className="-left-[4%] -top-[6%]" rotate={-8} />
        <Sticker emoji="heart" size={58} className="right-[44%] top-[10%]" rotate={12} delay={1.2} slow />
        <Sticker emoji="sparkles" size={52} className="right-[0%] top-[12%]" rotate={8} delay={0.6} />
        <Sticker emoji="graduation-cap" size={64} className="-left-[5%] top-[52%]" rotate={-12} delay={2} slow />
        <Sticker emoji="thumbs-up" size={52} className="bottom-[12%] left-[52%]" rotate={-10} delay={0.9} />
        <Sticker emoji="star-struck" size={54} className="-right-[3%] bottom-[38%]" rotate={-6} delay={1.6} slow />
        <Sticker emoji="party" size={46} className="-top-[4%] left-[44%]" rotate={14} delay={2.4} />
    </div>
  );
}
