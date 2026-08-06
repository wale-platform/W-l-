"use client";

import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

/**
 * Thin wrapper over sonner so toast styling and iconography live in one
 * place and call sites never import sonner directly. Swapping the
 * underlying library later touches only this file.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      // sonner renders into an aria-live region already; keeping the
      // duration generous gives screen readers time to announce.
      duration={5000}
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-field !border !border-ink-200 !bg-white !shadow-lifted !font-sans",
          title: "!text-ink-900 !font-medium !text-sm",
          description: "!text-ink-500 !text-sm",
        },
      }}
      icons={{
        success: <CheckCircle2 aria-hidden="true" className="size-4 text-success" />,
        error: <XCircle aria-hidden="true" className="size-4 text-danger" />,
        warning: <AlertTriangle aria-hidden="true" className="size-4 text-warning" />,
        info: <Info aria-hidden="true" className="size-4 text-info" />,
      }}
    />
  );
}

export const toast = sonnerToast;
