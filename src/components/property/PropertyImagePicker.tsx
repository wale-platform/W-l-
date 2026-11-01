"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { PROPERTY_IMAGE_LIMITS } from "@/lib/api/schemas";
import { resizeImage } from "@/lib/utils/image";
import { cn } from "@/lib/utils/cn";

export interface PickedImage {
  file: File;
  /** A data URL, so previews need no cleanup when photos are removed. */
  previewUrl: string;
}

interface PropertyImagePickerProps {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  error?: string;
  disabled?: boolean;
}

const ACCEPTED: readonly string[] = PROPERTY_IMAGE_LIMITS.types;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Photo picker for listing uploads: validates type and count, downsizes
 * each photo in the browser, and shows removable previews. The first photo
 * is the cover image shown on listing cards.
 */
export function PropertyImagePicker({ images, onChange, error, disabled }: PropertyImagePickerProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejection, setRejection] = useState("");

  const remaining = PROPERTY_IMAGE_LIMITS.maxCount - images.length;

  const handleSelect = async (selected: FileList | null) => {
    if (!selected?.length) return;
    setRejection("");

    const candidates = Array.from(selected);
    const unsupported = candidates.filter((file) => !ACCEPTED.includes(file.type));
    const supported = candidates.filter((file) => ACCEPTED.includes(file.type));
    const accepted = supported.slice(0, remaining);

    const problems: string[] = [];
    if (unsupported.length) problems.push("Only JPEG, PNG and WebP photos can be uploaded.");
    if (supported.length > accepted.length) {
      problems.push(`You can add up to ${PROPERTY_IMAGE_LIMITS.maxCount} photos.`);
    }

    setIsProcessing(true);
    try {
      const resized = await Promise.all(accepted.map((file) => resizeImage(file)));
      const fitting = resized.filter((file) => file.size <= PROPERTY_IMAGE_LIMITS.maxBytes);
      if (fitting.length < resized.length) problems.push("Some photos are larger than 5 MB and were skipped.");
      const picked = await Promise.all(
        fitting.map(async (file) => ({ file, previewUrl: await readAsDataUrl(file) })),
      );
      onChange([...images, ...picked]);
    } catch {
      problems.push("Those photos couldn't be read. Try different files.");
    } finally {
      setIsProcessing(false);
      setRejection(problems.join(" "));
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const message = error || rejection;

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Selected photos">
          {images.map((image, index) => (
            <li
              key={`${image.file.name}-${index}`}
              className="group relative aspect-[4/3] overflow-hidden rounded-field border border-ink-200 bg-ink-50"
            >
              {/* Local previews can't go through next/image's optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.previewUrl} alt={`Photo ${index + 1}`} className="size-full object-cover" />
              {index === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-ink-950/75 px-2 py-0.5 text-[11px] font-semibold text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== index))}
                disabled={disabled}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow hover:bg-white hover:text-danger disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <label
          htmlFor={inputId}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-field border-2 border-dashed px-4 py-8 text-center transition-colors",
            message ? "border-danger/50 bg-danger-subtle/40" : "border-ink-200 hover:border-brand-400 hover:bg-brand-50/40",
            (disabled || isProcessing) && "pointer-events-none opacity-60",
          )}
        >
          <ImagePlus className="size-7 text-brand-700" aria-hidden="true" />
          <span className="text-sm font-semibold text-ink-800">
            {isProcessing ? "Preparing photos…" : images.length ? "Add more photos" : "Add photos of the property"}
          </span>
          <span className="text-xs text-ink-500">
            JPEG, PNG or WebP · up to {PROPERTY_IMAGE_LIMITS.maxCount} photos · {remaining} remaining
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            disabled={disabled || isProcessing}
            aria-describedby={message ? messageId : undefined}
            aria-invalid={Boolean(message) || undefined}
            onChange={(event) => void handleSelect(event.target.files)}
            className="sr-only"
          />
        </label>
      )}

      {message && (
        <p id={messageId} role="alert" className="text-xs font-medium text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
