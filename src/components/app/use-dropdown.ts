"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Open/close state for a header dropdown. Closes on outside click, on
 * Escape (returning focus to the trigger), and on navigation — the open
 * state remembers the path it was opened on, so a route change closes it
 * during render without a setState-in-effect.
 */
export function useDropdown() {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpenedOn(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenedOn(null);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return {
    open,
    container,
    trigger,
    toggle: () => setOpenedOn(open ? null : pathname),
    close: () => setOpenedOn(null),
  };
}
