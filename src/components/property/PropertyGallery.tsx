"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { VerifiedBadge } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * The photographs, one large and the rest as thumbnails.
 *
 * Client-side because choosing a photo is the one genuinely interactive thing on
 * this page. Everything else about a listing is server-rendered — see the page
 * component — so this is deliberately the only island.
 *
 * Every photo after the first is lazy: a listing may carry a dozen, and a
 * student on a metered connection should not pay for eleven of them to look at
 * one. The first is `priority` because it is the largest thing above the fold and
 * the page's own loading impression.
 */
export function PropertyGallery({
  images,
  title,
  verified,
}: {
  images: string[];
  title: string;
  verified: boolean;
}) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-card bg-ink-100 text-ink-400">
        <ImageOff aria-hidden="true" className="size-8" />
        <p className="text-sm">No photographs yet</p>
      </div>
    );
  }

  // Guards against a photo being removed under a stale index.
  const current = images[Math.min(index, images.length - 1)];
  const step = (by: number) => setIndex((i) => (i + by + images.length) % images.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card bg-ink-100">
        <Image
          src={current}
          alt={
            images.length > 1
              ? `${title} — photograph ${index + 1} of ${images.length}`
              : title
          }
          fill
          sizes="(min-width: 1024px) 60vw, 100vw"
          priority
          className="object-cover"
        />

        {verified && (
          <div className="absolute left-4 top-4">
            <VerifiedBadge />
          </div>
        )}

        {images.length > 1 && (
          <>
            <GalleryButton side="left" onClick={() => step(-1)} />
            <GalleryButton side="right" onClick={() => step(1)} />

            {/* Announced politely so a screen reader user who steps through the
                photos hears which one they are on. */}
            <p
              aria-live="polite"
              className="absolute bottom-4 right-4 rounded-full bg-ink-900/75 px-3 py-1 text-xs font-medium text-white backdrop-blur"
            >
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((image, i) => (
            <li key={`${image}-${i}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photograph ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-field bg-ink-100 transition",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                  i === index
                    ? "ring-2 ring-brand-600 ring-offset-2"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="12vw"
                  loading={i === 0 ? undefined : "lazy"}
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photograph" : "Next photograph"}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ink-800 shadow-sm backdrop-blur transition",
        "hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
