"use client";

import { useState } from "react";
import Link from "next/link";
import { History, ImageOff, Pencil, Send, Trash2 } from "lucide-react";

import { VerificationHistory } from "@/components/property/VerificationHistory";
import { Alert, Badge, Button, Card, CardBody, Modal } from "@/components/ui";
import { propertyStatusCopy, type OwnerProperty } from "@/lib/api/schemas";

/**
 * One of the owner's listings, with the lifecycle on show.
 *
 * Distinct from the public listing card on purpose: this one exposes `status`,
 * which the public catalogue never does. The wording comes from
 * `propertyStatusCopy` so the label, colour, and explanation of a state are
 * defined once — a card that invents its own vocabulary is a card that tells
 * the owner something the server does not agree with.
 *
 * Actions mirror what the backend will actually allow: only DRAFT and REJECTED
 * listings can be sent for review, and only a listing with at least one photo.
 * Offering the button anyway and letting it fail is a worse way to learn that.
 *
 * `statusReason` is shown verbatim when the server sends one. It is the
 * reviewer's own words and the only thing that tells the owner what to fix, so
 * it is never summarised — and when it is absent the card says nothing rather
 * than guessing, because the server withholds a reason precisely when it no
 * longer describes where the listing stands.
 */
export function OwnerPropertyCard({
  property,
  editHref,
  onSubmitForReview,
  onDelete,
  isSubmitting = false,
}: {
  property: OwnerProperty;
  editHref: string;
  onSubmitForReview: () => void;
  onDelete: () => void;
  isSubmitting?: boolean;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { label, tone, hint } = propertyStatusCopy[property.status];
  const canSubmit = property.status === "DRAFT" || property.status === "REJECTED";
  const hasPhotos = property.images.length > 0;

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-ink-900">{property.title}</h3>
            <p className="text-sm text-ink-500">
              {property.address}, {property.city}, {property.state}
            </p>
          </div>

          <Badge tone={tone} className="self-start whitespace-nowrap">
            {label}
          </Badge>
        </div>

        <p className="text-xs leading-relaxed text-ink-500">{hint}</p>

        {property.statusReason && (
          <Alert
            tone={tone === "success" ? "success" : tone === "neutral" ? "info" : tone}
            title={
              property.status === "REJECTED"
                ? "What needs to change"
                : property.status === "SUSPENDED"
                  ? "Why it was taken down"
                  : "From our team"
            }
          >
            {property.statusReason}
          </Alert>
        )}

        <p className="text-lg font-semibold text-ink-900">
          ₦{property.price.toLocaleString("en-NG")}
          <span className="ml-1 text-sm font-normal text-ink-500">/ year</span>
        </p>

        {canSubmit && !hasPhotos && (
          <p className="flex items-start gap-2 rounded-field bg-warning-subtle px-3 py-2 text-xs text-ink-700">
            <ImageOff aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            Add at least one photo before sending this for review.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href={editHref}>
            <Button tone="outline" size="sm">
              <Pencil aria-hidden="true" className="size-3.5" />
              Edit
            </Button>
          </Link>

          {canSubmit && (
            <Button
              size="sm"
              onClick={onSubmitForReview}
              disabled={!hasPhotos}
              isLoading={isSubmitting}
              loadingText="Sending…"
            >
              <Send aria-hidden="true" className="size-3.5" />
              Send for review
            </Button>
          )}

          <Button size="sm" tone="ghost" onClick={() => setHistoryOpen(true)}>
            <History aria-hidden="true" className="size-3.5" />
            History
          </Button>

          <Button tone="danger" size="sm" onClick={onDelete}>
            <Trash2 aria-hidden="true" className="size-3.5" />
            Delete
          </Button>
        </div>
      </CardBody>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Status history"
        description={property.title}
      >
        {/* Mounted only while open, so an unopened card costs no request. */}
        {historyOpen && <VerificationHistory propertyId={property.id} />}
      </Modal>
    </Card>
  );
}
