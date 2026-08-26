"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarRange,
  CheckCircle2,
  ImageOff,
  Inbox,
  MapPin,
  MessageSquare,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/layout/Container";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
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
import { useConfirmResidence, useIncomingResidences, useRejectResidence } from "@/hooks/useResidences";
import { messageFrom } from "@/lib/api/field-errors";
import {
  rejectResidenceSchema,
  residenceStatusCopy,
  residenceStatusSchema,
  type OwnerResidence,
  type ResidenceStatus,
} from "@/lib/api/schemas";
import { formatDate, formatDateOnly, formatMonthYear } from "@/lib/utils/format";

/**
 * People claiming to have lived in the caller's properties, and the answer given.
 *
 * This screen is the safeguard. A confirmed claim is what lets somebody publish a
 * review that counts towards a property's rating, so the person who let the place is
 * asked first — and the question they are answering is narrow: do I recognise this
 * name and these dates. That is why the card carries a name, a period and their own
 * note, and why the server sends no phone number or email to put next to them.
 *
 * `corroborated` is the one piece of evidence the platform can offer by itself: a
 * viewing this person completed on this property, which means they physically turned
 * up. It is shown as what it is — a signal, not a verdict — and it is a snapshot
 * taken when the claim was made, so a viewing marked as done afterwards will not
 * appear on an older claim.
 *
 * Confirming takes one click; refusing does not. What an owner writes when they
 * refuse is all the claimant gets, and the difference between "you have the wrong
 * flat" and "I have never let to you" is the whole of it — so the dialog will not
 * submit without words, mirroring the rule the server enforces.
 *
 * Used by both the landlord page and the admin one. An admin sees every claim
 * because `listIncomingResidences` drops the ownership clause for them; this
 * component only changes the wording, and could not widen the query if it tried.
 * Nothing here is a security boundary — the endpoint scopes every row and every
 * decision to `property.ownerId`.
 */

const STATUS_OPTIONS = residenceStatusSchema.options;

export function IncomingResidencesView({ scope }: { scope: "landlord" | "admin" }) {
  const isAdmin = scope === "admin";

  // Undecided first, because a queue is a list of things waiting on you. The
  // decided ones are still reachable from the filter, which is where somebody
  // checking what they answered last month would look.
  const [status, setStatus] = useState<ResidenceStatus | "">("UNVERIFIED");
  const [page, setPage] = useState(1);
  const [pendingConfirm, setPendingConfirm] = useState<OwnerResidence | null>(null);
  const [pendingReject, setPendingReject] = useState<OwnerResidence | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);

  const query = useIncomingResidences({ ...(status ? { status } : {}), page });
  const confirm = useConfirmResidence();
  const reject = useRejectResidence();

  const claims = query.data?.residences ?? [];

  /** Step the page back when the row that just left was the last one on it. */
  function stepBackIfEmptied() {
    if (claims.length === 1 && page > 1) setPage((p) => p - 1);
  }

  function handleConfirm(claim: OwnerResidence) {
    confirm.mutate(claim.id, {
      onSuccess: () => {
        setPendingConfirm(null);
        toast.success("Confirmed", {
          description: `${claim.claimant.name} can now review "${claim.property.title}", and their rating will count as verified.`,
        });
        stepBackIfEmptied();
      },
      onError: (error) =>
        toast.error("That didn't go through", { description: messageFrom(error) }),
    });
  }

  function closeReject() {
    setPendingReject(null);
    setReason("");
    setReasonError(undefined);
  }

  function handleReject() {
    if (!pendingReject) return;

    // The server's own rule, applied here so a too-short reason lands on the field
    // being typed into rather than coming back as a rejected request.
    const parsed = rejectResidenceSchema.safeParse({ reason });
    if (!parsed.success) {
      setReasonError(parsed.error.issues.find((i) => i.path[0] === "reason")?.message);
      return;
    }

    const claim = pendingReject;
    reject.mutate(
      { id: claim.id, reason: parsed.data.reason },
      {
        onSuccess: () => {
          closeReject();
          toast.success("Claim not accepted", {
            description: `${claim.claimant.name} has been emailed your reason word for word.`,
          });
          stepBackIfEmptied();
        },
        onError: (error) =>
          toast.error("That didn't go through", { description: messageFrom(error) }),
      },
    );
  }

  return (
    <main id="main">
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow={isAdmin ? "Admin" : "Residence claims"}
            title={isAdmin ? "All residence claims" : "Did they live here?"}
            lead={
              isAdmin
                ? "Every claim across the platform, oldest first. Deciding one here acts as the property's owner would — and nobody, including you, may decide on their own claim."
                : "Confirming lets someone review your property, and their rating counts towards what students see. Oldest first, because they are waiting on you."
            }
            align="left"
          />

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <label htmlFor="residence-queue-status" className="text-sm font-medium text-ink-800">
              Showing
            </label>
            <Select
              id="residence-queue-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ResidenceStatus | "");
                setPage(1);
              }}
            >
              <option value="">Everything</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {residenceStatusCopy[option].label}
                </option>
              ))}
            </Select>
          </div>

          {query.isPending && (
            <div aria-busy="true" className="flex flex-col gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Couldn't load the claims"
              description={messageFrom(query.error, "Check your connection and try again.")}
              action={
                <Button tone="outline" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              }
            />
          )}

          {query.isSuccess && claims.length === 0 && (
            <EmptyState
              icon={<Inbox aria-hidden="true" className="size-5" />}
              title={
                status === "UNVERIFIED"
                  ? "Nothing waiting on you"
                  : status
                    ? `Nothing ${residenceStatusCopy[status].label.toLowerCase()}`
                    : "No claims yet"
              }
              description={
                status
                  ? "Change what you're showing to see the rest."
                  : isAdmin
                    ? "Claims appear here as people record places they have lived."
                    : "When a past tenant records living in one of your properties, it lands here and you get an email."
              }
              action={
                !status && !isAdmin ? (
                  <Link href="/landlord/properties">
                    <Button tone="outline">Check your listings</Button>
                  </Link>
                ) : undefined
              }
            />
          )}

          {claims.length > 0 && (
            <div className="flex flex-col gap-4">
              {claims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  isBusy={
                    (confirm.isPending && confirm.variables === claim.id) ||
                    (reject.isPending && reject.variables?.id === claim.id)
                  }
                  onConfirm={() => setPendingConfirm(claim)}
                  onReject={() => {
                    setPendingReject(claim);
                    setReason("");
                    setReasonError(undefined);
                  }}
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

      <ConfirmDialog
        open={pendingConfirm !== null}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => pendingConfirm && handleConfirm(pendingConfirm)}
        title="Confirm they lived here?"
        description={
          pendingConfirm
            ? `${pendingConfirm.claimant.name} says they lived at "${pendingConfirm.property.title}" from ${formatDateOnly(
                pendingConfirm.movedInAt,
              )}${
                pendingConfirm.movedOutAt ? ` to ${formatDateOnly(pendingConfirm.movedOutAt)}` : " and still does"
              }. Confirming lets them publish a review that counts towards this property's rating. It cannot be undone from here.`
            : undefined
        }
        confirmLabel="Yes, they lived here"
        isLoading={confirm.isPending}
      />

      <Modal
        open={pendingReject !== null}
        onClose={closeReject}
        title="Not accepting this claim"
        description="They are emailed what you write, word for word. It is all they get."
        footer={
          <>
            <Button tone="outline" onClick={closeReject} disabled={reject.isPending}>
              Cancel
            </Button>
            <Button tone="danger" onClick={handleReject} isLoading={reject.isPending}>
              Send and refuse
            </Button>
          </>
        }
      >
        {pendingReject && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-medium text-ink-900">{pendingReject.property.title}</p>
              <p className="text-ink-600">
                {pendingReject.claimant.name} · {period(pendingReject)}
              </p>
            </div>

            {/* Stated at the moment of the decision, not in a help page: an owner
                refusing a claim the platform has evidence for should know that is
                what they are doing. */}
            {pendingReject.corroborated && (
              <Alert tone="warning" title="They viewed this property through WALE">
                A viewing by this person on this property was marked as completed, so
                they did turn up at least once. That is not proof they rented it — but
                worth a second look before refusing.
              </Alert>
            )}

            <FormField
              label="Why not?"
              required
              hint="“Nobody by that name rented flat 3” tells them something. “No” does not."
              error={reasonError}
            >
              {(field) => (
                <Textarea
                  {...field}
                  rows={4}
                  maxLength={1000}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    if (reasonError) setReasonError(undefined);
                  }}
                  placeholder="I let flat 3 to a family for the whole of that period — I think you have the wrong building."
                />
              )}
            </FormField>
          </div>
        )}
      </Modal>
    </main>
  );
}

/** "September 2024 – August 2025", or "– present" while the tenancy is live. */
function period(claim: OwnerResidence): string {
  const from = formatMonthYear(claim.movedInAt);
  return claim.movedOutAt ? `${from} – ${formatMonthYear(claim.movedOutAt)}` : `${from} – present`;
}

/**
 * One claim: who, which property, which dates, and what backs it up.
 *
 * The buttons appear only on an undecided claim. A decided one is refused by the
 * server rather than overwritten — an owner who genuinely got it wrong needs an
 * admin, and the row keeps who decided it, so a correction is attributable rather
 * than invisible.
 */
function ClaimCard({
  claim,
  isBusy,
  onConfirm,
  onReject,
}: {
  claim: OwnerResidence;
  isBusy: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const { label, tone } = residenceStatusCopy[claim.status];
  const cover = claim.property.image;
  const undecided = claim.status === "UNVERIFIED";

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-field bg-ink-100 sm:w-40">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(min-width: 640px) 10rem, 100vw"
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
              <h3 className="text-base font-semibold text-ink-900">
                {claim.claimant.name} says they lived at {claim.property.title}
              </h3>
              <p className="flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                {claim.property.address}, {claim.property.city}, {claim.property.state}
              </p>
            </div>
            <Badge tone={tone} className="whitespace-nowrap">
              {label}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
            <span className="flex items-center gap-1.5 font-medium text-ink-900">
              <CalendarRange aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
              {period(claim)}
            </span>
            <span className="flex items-center gap-1.5 text-ink-500">
              <User aria-hidden="true" className="size-3.5 shrink-0" />
              {formatDateOnly(claim.movedInAt)}
              {claim.movedOutAt ? ` – ${formatDateOnly(claim.movedOutAt)}` : " – still there"}
            </span>
          </div>

          {/* The one signal the platform can offer on its own. Worded as evidence
              of a visit, which is what it is — not as proof of a tenancy. */}
          {claim.corroborated && (
            <p className="flex items-start gap-2 rounded-field bg-success-subtle px-3 py-2 text-sm text-ink-800">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-success" />
              <span>
                <span className="font-medium">They viewed this property through WALE.</span>{" "}
                A viewing by them here was marked as completed, so they did turn up.
              </span>
            </p>
          )}

          {claim.note && (
            <p className="flex items-start gap-2 rounded-field bg-ink-50 px-3 py-2 text-sm text-ink-700">
              <MessageSquare aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-400" />
              <span className="whitespace-pre-line">
                <span className="font-medium text-ink-800">They said: </span>
                {claim.note}
              </span>
            </p>
          )}

          {claim.status === "REJECTED" && (
            <Alert tone="info" title="What you told them">
              {claim.decisionReason ?? "No reason was recorded."}
            </Alert>
          )}

          {claim.status === "CONFIRMED" && (
            <p className="flex items-center gap-1.5 text-sm text-ink-600">
              <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0 text-success" />
              Confirmed
              {claim.decidedAt ? ` on ${formatDate(claim.decidedAt)}` : ""}. They can review
              this property, and it counts as verified.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {undecided ? (
              <>
                <Button size="sm" onClick={onConfirm} disabled={isBusy}>
                  <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  They lived here
                </Button>
                <Button size="sm" tone="danger" onClick={onReject} disabled={isBusy}>
                  <XCircle aria-hidden="true" className="size-3.5" />
                  They did not
                </Button>
              </>
            ) : (
              <p className="text-sm text-ink-500">
                Already answered. An admin can correct a mistake.
              </p>
            )}

            <Link
              href={`/properties/${claim.property.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
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
