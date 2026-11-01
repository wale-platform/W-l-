"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Rocket, Trash2 } from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";

interface PropertyCardProps {
  title: string;
  price: number;
  location: string;
  status: "pending" | "approved" | "rejected";
  onDelete: () => void;
  /** Cover photo. */
  image?: string;
  /** Public listing page. */
  href?: string;
  /** End of an active paid boost, if any. */
  boostedUntil?: string | null;
  onBoost?: () => void;
}

const statusCopy = {
  pending: { tone: "warning", label: "Pending verification", note: "A WALE agent will check it soon." },
  approved: { tone: "success", label: "Verified", note: "Live with the WALE badge." },
  rejected: { tone: "danger", label: "Needs attention", note: "Contact us to fix this listing." },
} as const;

/** A listing as its owner sees it in "My properties". */
export function PropertyCard({
  title,
  price,
  location,
  status,
  onDelete,
  image,
  href,
  boostedUntil,
  onBoost,
}: PropertyCardProps) {
  const copy = statusCopy[status];
  // Captured once per mount; render must stay pure.
  const [now] = useState(() => Date.now());
  const boostActive = boostedUntil ? new Date(boostedUntil).getTime() > now : false;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="relative aspect-[16/10] bg-ink-100">
        {image && (
          <Image src={image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge tone={copy.tone}>{copy.label}</Badge>
          {boostActive && (
            <Badge tone="brand">
              <Rocket aria-hidden="true" className="size-3" /> Boosted
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="line-clamp-2 text-base font-bold text-ink-900">{title}</h3>
          <p className="mt-1 line-clamp-1 text-sm text-ink-500">{location}</p>
        </div>
        <p className="text-lg font-extrabold text-ink-900">
          ₦{price.toLocaleString("en-NG")} <span className="text-sm font-normal text-ink-500">/ year</span>
        </p>
        <p className="text-xs text-ink-500">
          {boostActive
            ? `Boosted until ${new Date(boostedUntil!).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} — shown first in search.`
            : copy.note}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {href && (
            <Link href={href}>
              <Button tone="outline" size="sm">
                <Eye aria-hidden="true" className="size-4" /> View
              </Button>
            </Link>
          )}
          {onBoost && (
            <Button size="sm" onClick={onBoost}>
              <Rocket aria-hidden="true" className="size-4" /> {boostActive ? "Extend boost" : "Boost"}
            </Button>
          )}
          <Button tone="ghost" size="sm" onClick={onDelete} className="text-danger hover:bg-danger-subtle">
            <Trash2 aria-hidden="true" className="size-4" /> Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
