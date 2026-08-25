"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  ImageOff,
  MapPin,
  MessageSquare,
  Search,
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
  Pagination,
  Select,
  Skeleton,
  toast,
} from "@/components/ui";
import { useCancelInspection, useMyInspections } from "@/hooks/useInspections";
import { messageFrom } from "@/lib/api/field-errors";
import {
  inspectionStatusCopy,
  inspectionStatusSchema,
  type Inspection,
  type InspectionStatus,
} from "@/lib/api/schemas";
import { formatDateTime, formatNaira } from "@/lib/utils/format";

/**
 * The viewings this person has asked for, across every listing.
 *
 * The listing page answers "have I asked about THIS place"; this answers "what
 * am I waiting on" — which is the question after three or four requests, and the
 * one no single listing page can answer.
 *
 * Cancelling lives here as well as on the listing page, because someone whose
 * plans changed is thinking about their week, not about a particular flat.
 */

const STATUS_OPTIONS = inspectionStatusSchema.options;

export function MyInspectionsView() {
  const [status, setStatus] = useState<InspectionStatus | "">("");
  const [page, setPage] = useState(1);
  const [pendingCancel, setPendingCancel] = useState<Inspection | null>(null);

  const query = useMyInspections({ ...(status ? { status } : {}), page });
  const cancel = useCancelInspection();

  const requests = query.data?.inspections ?? [];

  function handleCancel(inspection: Inspection) {
    cancel.mutate(inspection.id, {
      onSuccess: () => {
        setPendingCancel(null);
        toast.success("Viewing cancelled", {
          description: `The landlord will see that "${inspection.property.title}" was called off.`,
        });
        if (requests.length === 1 && page > 1) setPage((p) => p - 1);
      },
      onError: (error) =>
        toast.error("Couldn't cancel that", { description: messageFrom(error) }),
    });
  }

  return (
    <main id="main">
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Viewings"
            title="Places you've asked to see"
            lead="Newest first. A landlord gets your phone number only once they confirm — until then they have your name and the time you asked for."
            align="left"
          />

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <label htmlFor="my-inspection-status" className="text-sm font-medium text-ink-800">
              Showing
            </label>
            <Select
              id="my-inspection-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as InspectionStatus | "");
                setPage(1);
              }}
            >
              <option value="">Everything</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {inspectionStatusCopy[option].label}
                </option>
              ))}
            </Select>
          </div>

          {query.isPending && (
            <div aria-busy="true" className="flex flex-col gap-4">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Couldn't load your viewings"
              description={messageFrom(query.error, "Check your connection and try again.")}
              action={
                <Button tone="outline" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              }
            />
          )}

          {query.isSuccess && requests.length === 0 && (
            <EmptyState
              icon={<CalendarClock aria-hidden="true" className="size-5" />}
              title={
                status
                  ? `Nothing ${inspectionStatusCopy[status].label.toLowerCase()}`
                  : "You haven't asked to view anywhere yet"
              }
              description={
                status
                  ? "Change what you're showing to see the rest."
                  : "Never rent a room you have not stood in. Find a place you like and book a viewing from its page."
              }
              action={
                status ? undefined : (
                  <Link href="/properties">
                    <Button>
                      <Search aria-hidden="true" className="size-4" />
                      Browse homes
                    </Button>
                  </Link>
                )
              }
            />
          )}

          {requests.length > 0 && (
            <div className="flex flex-col gap-4">
              {requests.map((inspection) => (
                <MyRequestCard
                  key={inspection.id}
                  inspection={inspection}
                  isBusy={cancel.isPending && cancel.variables === inspection.id}
                  onCancel={() => setPendingCancel(inspection)}
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
        open={pendingCancel !== null}
        onClose={() => setPendingCancel(null)}
        onConfirm={() => pendingCancel && handleCancel(pendingCancel)}
        title={
          pendingCancel?.status === "CONFIRMED"
            ? "Cancel this viewing?"
            : "Withdraw this request?"
        }
        description={
          pendingCancel?.status === "CONFIRMED"
            ? `The landlord confirmed ${
                pendingCancel ? formatDateTime(pendingCancel.preferredAt) : ""
              } and may be planning around it. Tell them if you can.`
            : "The landlord will see it was called off. You can ask again later if you change your mind."
        }
        confirmLabel={pendingCancel?.status === "CONFIRMED" ? "Cancel viewing" : "Withdraw"}
        tone="danger"
        isLoading={cancel.isPending}
      />
    </main>
  );
}

/** One request, from the side of the person who made it. */
function MyRequestCard({
  inspection,
  isBusy,
  onCancel,
}: {
  inspection: Inspection;
  isBusy: boolean;
  onCancel: () => void;
}) {
  const { label, tone } = inspectionStatusCopy[inspection.status];
  const cover = inspection.property.image;
  // The two live states — the only ones the server will still let go.
  const cancellable = inspection.status === "REQUESTED" || inspection.status === "CONFIRMED";

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row">
        <Link
          href={`/properties/${inspection.property.id}`}
          className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-field bg-ink-100 sm:w-40"
        >
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
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="text-base font-semibold text-ink-900">
                <Link
                  href={`/properties/${inspection.property.id}`}
                  className="underline-offset-4 hover:text-brand-700 hover:underline"
                >
                  {inspection.property.title}
                </Link>
              </h3>
              <p className="flex items-center gap-1.5 text-sm text-ink-500">
                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                {inspection.property.address}, {inspection.property.city},{" "}
                {inspection.property.state}
              </p>
            </div>
            <Badge tone={tone} className="whitespace-nowrap">
              {label}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-700">
            <span className="flex items-center gap-1.5 font-medium text-ink-900">
              {inspection.status === "CONFIRMED" ? (
                <CalendarCheck aria-hidden="true" className="size-3.5 shrink-0 text-success" />
              ) : (
                <CalendarClock aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
              )}
              {formatDateTime(inspection.preferredAt)}
            </span>
            <span>{formatNaira(inspection.property.price)} / year</span>
          </div>

          {inspection.note && (
            <p className="flex items-start gap-2 rounded-field bg-ink-50 px-3 py-2 text-sm text-ink-700">
              <MessageSquare aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-400" />
              <span className="whitespace-pre-line">
                <span className="font-medium text-ink-800">You said: </span>
                {inspection.note}
              </span>
            </p>
          )}

          {/* Their words, verbatim — a declined request is only useful if the
              reason survives the trip. */}
          {inspection.response && (
            <Alert
              tone={inspection.status === "CONFIRMED" ? "success" : "info"}
              title="From the landlord"
            >
              {inspection.response}
            </Alert>
          )}

          {inspection.status === "REQUESTED" && (
            <p className="text-xs leading-relaxed text-ink-500">
              Waiting on the landlord. They have been emailed.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {cancellable && (
              <Button size="sm" tone="outline" onClick={onCancel} disabled={isBusy}>
                {inspection.status === "CONFIRMED" ? "Cancel viewing" : "Withdraw request"}
              </Button>
            )}
            <Link href={`/properties/${inspection.property.id}`}>
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
