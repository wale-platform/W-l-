"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

/**
 * Modal built on the native <dialog> element.
 *
 * `showModal()` gives us, from the browser rather than from a library:
 * focus trapping, Esc-to-close, top-layer stacking above any z-index,
 * an inert background, and `::backdrop` styling. Next 16's browser
 * floor (Chrome 111+, Safari 16.4+) is exactly <dialog>'s baseline, so
 * there is no gap to polyfill here.
 *
 * The one thing native does not give us is close-on-backdrop-click,
 * which we add below.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Esc fires `cancel` natively; forward it so parent state stays in sync.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      // The dialog element itself is the click target that fills the
      // viewport; clicks landing on it (rather than on the inner panel,
      // which stops propagation) mean the backdrop was hit.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "w-[calc(100vw-2rem)] rounded-card border border-ink-200 bg-white p-0 shadow-lifted",
        "backdrop:bg-ink-950/45 backdrop:backdrop-blur-[2px]",
        // <dialog> is not centred by default in the top layer.
        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        widths[size],
      )}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] flex-col"
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div className="flex flex-col gap-1">
            <h2 id="modal-title" className="text-lg font-semibold text-ink-900">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-sm text-ink-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 rounded-field p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {children && (
          <div className="overflow-y-auto px-5 pb-5 text-sm text-ink-700">
            {children}
          </div>
        )}

        {footer && (
          <div className="flex justify-end gap-3 border-t border-ink-100 p-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

/**
 * Confirmation dialog — a `Modal` with the common two-action footer
 * pre-wired, so call sites do not re-implement it each time.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  isLoading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  isLoading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button tone="outline" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button tone={tone} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
