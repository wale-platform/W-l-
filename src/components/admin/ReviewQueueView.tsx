"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  History,
  ImageOff,
  MapPin,
  Ban,
  XCircle,
} from "lucide-react";

import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout/Container";
import { VerificationHistory } from "@/components/property/VerificationHistory";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  FormField,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Textarea,
  toast,
} from "@/components/ui";
import { useDecideProperty, useReviewQueue } from "@/hooks/useReviewQueue";
import { messageFrom } from "@/lib/api/field-errors";
import {
  propertyDecisionSchema,
  propertyStatusCopy,
  propertyStatusSchema,
  type OwnerProperty,
  type PropertyStatus,
} from "@/lib/api/schemas";

/**
 * The admin review queue: what is waiting, and the decision made on it.
 *
 * The whole point of this screen is that a decision is not a click on a
 * coloured button — it is something a landlord reads. So rejecting or suspending
 * opens a dialog and will not proceed without a reason, mirroring the rule the
 * server enforces. Approving needs no explanation and takes one click.
 *
 * Nothing here is a security boundary. `requireRole(["ADMIN"])` gates the page
 * render and `requireRole("ADMIN")` gates the endpoint; this component would be
 * just as unable to verify a listing if it rendered for a tenant.
 */

/** The two decisions that need explaining, and how each is worded. */
const DECISIONS = {
  VERIFIED: {
    label: "Approve",
    tone: "primary" as const,
    icon: CheckCircle2,
    title: "Approve this listing?",
    description:
      "It goes live with the verified badge and the owner is emailed. Nothing to explain — you can add a note if you want to.",
    reasonLabel: "Note (optional)",
    reasonHint: "The owner sees this. Leave it blank unless there is something worth saying.",
    confirm: "Approve and publish",
  },
  REJECTED: {
    label: "Reject",
    tone: "danger" as const,
    icon: XCircle,
    title: "Send this back to the owner?",
    description:
      "They can fix it and resubmit. What you write is the only instruction they get, so say what needs changing.",
    reasonLabel: "What needs to change",
    reasonHint: "The landlord reads this word for word.",
    confirm: "Reject listing",
  },
  SUSPENDED: {
    label: "Suspend",
    tone: "danger" as const,
    icon: Ban,
    title: "Take this listing down?",
    description:
      "It stops being visible to students and the owner cannot resubmit it themselves. Use this for a listing that should not be up at all.",
    reasonLabel: "Why it is being taken down",
    reasonHint: "The landlord reads this word for word.",
    confirm: "Suspend listing",
  },
} satisfies Partial<
  Record<
    PropertyStatus,
    {
      label: string;
      tone: "primary" | "danger";
      icon: typeof CheckCircle2;
      title: string;
      description: string;
      reasonLabel: string;
      reasonHint: string;
      confirm: string;
    }
  >
>;

type Decision = keyof typeof DECISIONS;

const STATUS_OPTIONS = propertyStatusSchema.options.filter((s) => s !== "DRAFT");

export function ReviewQueueView() {
  const [status, setStatus] = useState<PropertyStatus>("PENDING_VERIFICATION");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ property: OwnerProperty; decision: Decision } | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  const [historyFor, setHistoryFor] = useState<OwnerProperty | null>(null);

  const query = useReviewQueue({ status, page });
  const decide = useDecideProperty();

  const listings = query.data?.properties ?? [];

  function open(property: OwnerProperty, decision: Decision) {
    setPending({ property, decision });
    setReason("");
    setReasonError(undefined);
  }

  function close() {
    setPending(null);
    setReason("");
    setReasonError(undefined);
  }

  function confirm() {
    if (!pending) return;

    // The same schema the server applies, so a missing reason is caught on the
    // field the reviewer is looking at rather than as a failed request.
    const parsed = propertyDecisionSchema.safeParse({
      status: pending.decision,
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    });
    if (!parsed.success) {
      setReasonError(parsed.error.issues.find((i) => i.path[0] === "reason")?.message);
      return;
    }

    const { property, decision } = pending;
    decide.mutate(
      { id: property.id, decision: parsed.data },
      {
        onSuccess: () => {
          close();
          toast.success(
            decision === "VERIFIED" ? "Listing approved" : `Listing ${decision.toLowerCase()}`,
            {
              description: property.landlord.email
                ? `"${property.title}" — the owner has been emailed.`
                : `"${property.title}" — no owner account on this listing, so nobody was emailed.`,
            },
          );
          // The last row of the last page just left the queue.
          if (listings.length === 1 && page > 1) setPage((p) => p - 1);
        },
        onError: (error) =>
          toast.error("That decision didn't go through", { description: messageFrom(error) }),
      },
    );
  }

  const copy = pending ? DECISIONS[pending.decision] : null;

  return (
    <main>
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="Review listings"
            lead="Whoever has waited longest is first. What you write when you reject or suspend a listing is what the landlord reads."
            align="left"
          />

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <label htmlFor="queue-status" className="text-sm font-medium text-ink-800">
              Showing
            </label>
            <Select
              id="queue-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as PropertyStatus);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {propertyStatusCopy[option].label}
                </option>
              ))}
            </Select>
          </div>

          {query.isPending && (
            <div aria-busy="true" className="flex flex-col gap-4">
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Couldn't load the queue"
              description={messageFrom(query.error, "Check your connection and try again.")}
              action={
                <Button tone="outline" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              }
            />
          )}

          {query.isSuccess && listings.length === 0 && (
            <EmptyState
              icon={<ClipboardCheck aria-hidden="true" className="size-5" />}
              title={
                status === "PENDING_VERIFICATION"
                  ? "Nothing waiting on a decision"
                  : `Nothing ${propertyStatusCopy[status].label.toLowerCase()}`
              }
              description={
                status === "PENDING_VERIFICATION"
                  ? "Listings appear here as landlords send them for review."
                  : "Change what you're showing to see other listings."
              }
            />
          )}

          {listings.length > 0 && (
            <div className="flex flex-col gap-4">
              {listings.map((property) => (
                <ReviewCard
                  key={property.id}
                  property={property}
                  isBusy={decide.isPending && decide.variables?.id === property.id}
                  onDecide={(decision) => open(property, decision)}
                  onHistory={() => setHistoryFor(property)}
                />
              ))}
            </div>
          )}

          {query.data && (
            <Pagination
              page={query.data.page}
              totalPages={query.data.totalPages}
              onPageChange={setPage}
              className="justify-center"
            />
          )}
        </Container>
      </Section>

      <Modal
        open={pending !== null}
        onClose={close}
        title={copy?.title ?? ""}
        description={copy?.description}
        footer={
          <>
            <Button tone="outline" onClick={close} disabled={decide.isPending}>
              Cancel
            </Button>
            <Button tone={copy?.tone ?? "primary"} onClick={confirm} isLoading={decide.isPending}>
              {copy?.confirm ?? "Confirm"}
            </Button>
          </>
        }
      >
        {pending && copy && (
          <div className="flex flex-col gap-4">
            <p className="font-medium text-ink-900">{pending.property.title}</p>

            <FormField label={copy.reasonLabel} hint={copy.reasonHint} error={reasonError}>
              {(field) => (
                <Textarea
                  {...field}
                  rows={4}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    if (reasonError) setReasonError(undefined);
                  }}
                  placeholder={
                    pending.decision === "VERIFIED"
                      ? "Anything the owner should know"
                      : "Be specific — this is all they have to go on"
                  }
                />
              )}
            </FormField>
          </div>
        )}
      </Modal>

      <Modal
        open={historyFor !== null}
        onClose={() => setHistoryFor(null)}
        title="Status history"
        description={historyFor?.title}
      >
        {historyFor && <VerificationHistory propertyId={historyFor.id} />}
      </Modal>
    </main>
  );
}

/**
 * One listing awaiting a decision.
 *
 * Shows the first photo, the address, and the price — the three things a
 * reviewer checks — plus whatever was last decided about it, so a listing that
 * has been round this loop before does not arrive looking brand new.
 */
function ReviewCard({
  property,
  isBusy,
  onDecide,
  onHistory,
}: {
  property: OwnerProperty;
  isBusy: boolean;
  onDecide: (decision: Decision) => void;
  onHistory: () => void;
}) {
  const cover = property.images[0];
  const { label, tone } = propertyStatusCopy[property.status];

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-field bg-ink-100 sm:w-48">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(min-width: 640px) 12rem, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-ink-400">
              <ImageOff aria-hidden="true" className="size-6" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-base font-semibold text-ink-900">{property.title}</h3>
              <p className="flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                {property.address}, {property.city}, {property.state}
              </p>
            </div>
            <Badge tone={tone} className="whitespace-nowrap">
              {label}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
            <span className="font-semibold text-ink-900">
              ₦{property.price.toLocaleString("en-NG")}
              <span className="ml-1 font-normal text-ink-500">/ year</span>
            </span>
            <span>
              {property.bedrooms} bed · {property.bathrooms} bath
            </span>
            <span>{property.images.length} photos</span>
            <span>Listed by {property.landlord.name}</span>
          </div>

          {property.statusReason && (
            <Alert tone="warning" title="Last decision">
              {property.statusReason}
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {(Object.keys(DECISIONS) as Decision[])
              // Never offer the state it is already in — the server refuses it,
              // and a button that cannot work is a button worth removing.
              .filter((decision) => decision !== property.status)
              .map((decision) => {
                const { label: actionLabel, tone: actionTone, icon: Icon } = DECISIONS[decision];
                return (
                  <Button
                    key={decision}
                    size="sm"
                    tone={decision === "VERIFIED" ? "primary" : actionTone}
                    onClick={() => onDecide(decision)}
                    disabled={isBusy}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                    {actionLabel}
                  </Button>
                );
              })}

            <Button size="sm" tone="ghost" onClick={onHistory}>
              <History aria-hidden="true" className="size-3.5" />
              History
            </Button>

            <Link href={`/properties/${property.id}`} target="_blank" rel="noopener noreferrer">
              <Button size="sm" tone="ghost">
                View listing
              </Button>
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
