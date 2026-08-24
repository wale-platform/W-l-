"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Trash2 } from "lucide-react";

import { Alert, Button } from "@/components/ui";
import { messageFrom } from "@/lib/api/field-errors";
import {
  ACCEPTED_IMAGE_ACCEPT_ATTR,
  imageRejectionReason,
  mediaApi,
} from "@/lib/api/media";
import { MAX_PROPERTY_IMAGES } from "@/lib/api/schemas";
import { cn } from "@/lib/utils/cn";

/**
 * Listing photos.
 *
 * Each file goes straight to Cloudinary (see `mediaApi.uploadImage`); what this
 * component holds is the list of URLs that came back, which is exactly what the
 * form submits. Nothing is uploaded through our own API.
 *
 * The value is a plain `string[]` owned by the form, not internal state, so a
 * half-finished upload can never be the reason a listing saves without its
 * photos: if a URL is in the array, the file is already on the CDN.
 *
 * Order is meaningful — the first photo is the cover students see in search
 * results — which is why there are move controls rather than just a delete.
 */

export interface ImageUploaderProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Validation message from the form (e.g. the max-photos rule). */
  error?: string;
  disabled?: boolean;
}

export function ImageUploader({ value, onChange, error, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);

  const remaining = MAX_PROPERTY_IMAGES - value.length;
  const busy = uploading > 0;

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;

    const picked = Array.from(files);

    // Everything that can be checked before spending anybody's data bundle:
    // the count cap first, then each file's type and size.
    const accepted: File[] = [];
    const rejected: string[] = [];

    for (const file of picked) {
      if (accepted.length >= remaining) {
        rejected.push(
          `Only ${MAX_PROPERTY_IMAGES} photos per listing — ${file.name} wasn't added`,
        );
        continue;
      }
      const reason = imageRejectionReason(file);
      if (reason) rejected.push(reason);
      else accepted.push(file);
    }

    setProblems(rejected);
    if (!accepted.length) return;

    setUploading((n) => n + accepted.length);

    // `allSettled`, so eight photos where the fourth fails still adds the other
    // seven. A partial success is the honest outcome and losing the good uploads
    // to one bad file would be worse.
    const results = await Promise.allSettled(
      accepted.map((file) => mediaApi.uploadImage(file)),
    );

    const uploaded: string[] = [];
    const failures: string[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") uploaded.push(result.value);
      else {
        failures.push(
          `${accepted[index]!.name}: ${messageFrom(
            result.reason,
            "upload failed, please try again",
          )}`,
        );
      }
    });

    setUploading((n) => n - accepted.length);
    if (uploaded.length) onChange([...value, ...uploaded]);
    if (failures.length) setProblems((prev) => [...prev, ...failures]);
  }

  function remove(index: number) {
    // Only dropped from the listing. The asset stays in Cloudinary — deleting it
    // needs a signed destroy call, and orphan cleanup is a server-side job, not
    // something to fire from a form that may never be saved.
    onChange(value.filter((_, i) => i !== index));
  }

  function move(index: number, by: -1 | 1) {
    const target = index + by;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      {value.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url, index) => (
            <li
              key={url}
              className="group relative overflow-hidden rounded-xl border border-ink-200 bg-ink-50"
            >
              <div className="relative aspect-4/3">
                <Image
                  src={url}
                  alt={index === 0 ? "Cover photo" : `Photo ${index + 1}`}
                  fill
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>

              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-md bg-ink-900/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  Cover
                </span>
              )}

              {/* Always visible rather than shown on hover: a touch screen has no
                  hover, and this is a phone-first form. */}
              <div className="flex items-center justify-between gap-1 border-t border-ink-200 bg-white p-1.5">
                <div className="flex gap-1">
                  <IconButton
                    label={`Move photo ${index + 1} earlier`}
                    onClick={() => move(index, -1)}
                    disabled={disabled || index === 0}
                  >
                    <ArrowLeft aria-hidden="true" className="size-3.5" />
                  </IconButton>
                  <IconButton
                    label={`Move photo ${index + 1} later`}
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === value.length - 1}
                  >
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </IconButton>
                </div>

                <IconButton
                  label={`Remove photo ${index + 1}`}
                  onClick={() => remove(index)}
                  disabled={disabled}
                  tone="danger"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_IMAGE_ACCEPT_ATTR}
          className="sr-only"
          // Cleared so picking the same file twice in a row still fires a change.
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
          disabled={disabled || busy || remaining <= 0}
        />

        <Button
          type="button"
          tone="outline"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy || remaining <= 0}
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Uploading {uploading} photo{uploading === 1 ? "" : "s"}…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ImagePlus aria-hidden="true" className="size-4" />
              {value.length ? "Add more photos" : "Add photos"}
            </span>
          )}
        </Button>

        <p className="text-xs text-ink-500">
          {remaining > 0
            ? `JPG, PNG or WebP. ${remaining} of ${MAX_PROPERTY_IMAGES} left.`
            : `That's all ${MAX_PROPERTY_IMAGES} photos — remove one to add another.`}
        </p>
      </div>

      {/* Announced, because an upload finishes long after the click. */}
      <p aria-live="polite" className="sr-only">
        {busy ? `Uploading ${uploading} photos` : `${value.length} photos added`}
      </p>

      {problems.length > 0 && (
        <Alert tone="warning" title="Some photos weren't added">
          <ul className="list-inside list-disc space-y-0.5">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Alert>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

/** A small square button. Local to this component; not part of the UI kit. */
function IconButton({
  label,
  onClick,
  disabled,
  tone = "neutral",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "neutral" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-md p-1.5 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "disabled:cursor-not-allowed disabled:opacity-40",
        tone === "danger"
          ? "text-danger hover:bg-danger/10"
          : "text-ink-600 hover:bg-ink-100",
      )}
    >
      {children}
    </button>
  );
}
