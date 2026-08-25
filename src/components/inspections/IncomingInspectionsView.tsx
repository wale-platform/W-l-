"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  ImageOff,
  MapPin,
  MessageSquare,
  Phone,
  XCircle,
} from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/layout/Container";
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
import { useIncomingInspections, useRespondToInspection } from "@/hooks/useInspections";
import { messageFrom } from "@/lib/api/field-errors";
import {
  inspectionDecisionSchema,
  inspectionStatusCopy,
  inspectionStatusSchema,
  type InspectionStatus,
  type LandlordInspection,
} from "@/lib/api/schemas";
import { formatDateTime, formatNaira } from "@/lib/utils/format";

/**
 * Viewing requests on the caller's listings, and the answers given to them.
 *
 * Confirming takes one click; declining does not. What a landlord writes when
 * they decline is the only thing the tenant gets — the difference between
 * "propose another Saturday" and "give up on this flat" — so the dialog will not
 * submit without it, mirroring the rule the server enforces.
 *
 * Used by both the landlord page and the admin one. An admin sees every
 * listing's requests because `listIncomingInspections` drops the ownership clause
 * for them; this component only changes the wording, and could not widen the
 * query if it tried.
 *
 * Nothing here is a security boundary. The endpoint scopes every row to
 * `property.ownerId`, so a landlord who reached this screen for someone else's
 * listing would still be shown nothing and still be unable to answer anything.
 */

/** The three answers, and how each is worded to the person giving it. */
const DECISIONS = {
  CONFIRMED: {
    label: "Confirm",
    tone: "primary" as const,
    icon: CheckCircle2,
    title: "Confirm this viewing?",
    description:
      "The tenant is emailed that the time stands, and you get their phone number so you can reach them at the gate. Add directions if the place is hard to find.",
    reasonLabel: "Anything they need to know (optional)",
    reasonHint: "“Come to the black gate and ask for Musa.” They read this word for word.",
    placeholder: "Come to the black gate and ask for Musa.",
    confirm: "Confirm viewing",
  },
  DECLINED: {
    label: "Decline",
    tone: "danger" as const,
    icon: XCircle,
    title: "Decline this viewing?",
    description:
      "The tenant is emailed your reason. If the time is the only problem, say which times do work — you cannot change their time for them, but they can ask again.",
    reasonLabel: "Why, or when would work instead",
    reasonHint: "The tenant reads this word for word. “No” on its own tells them nothing.",
    placeholder: "I'm travelling that weekend — Saturday the 12th would work, any time before noon.",
    confirm: "Decline and send",
  },
  COMPLETED: {
    label: "Mark as viewed",
    tone: "outline" as const,
    icon: CalendarCheck,
    title: "Mark this viewing as done?",
    description:
      "Just for your own records — the tenant was there, so nobody is emailed about it.",
    reasonLabel: "Note for yourself (optional)",
    reasonHint: "Kept on the record. The tenant can see it if they look.",
    placeholder: "Showed up on time, taking a day to decide.",
    confirm: "Mark as viewed",
  },
} satisfies Record<
  "CONFIRMED" | "DECLINED" | "COMPLETED",
  {
    label: string;
    tone: "primary" | "danger" | "outline";
    icon: typeof CheckCircle2;
    title: string;
    description: string;
    reasonLabel: string;
    reasonHint: string;
    placeholder: string;
    confirm: string;
  }
>;

type Decision = keyof typeof DECISIONS;

/**
 * Which answers are still open on a request.
 *
 * The same rules the service applies, so no button is offered that the server
 * would refuse: a closed request takes no answer at all, an unanswered one
 * cannot jump straight to COMPLETED, and nothing can be set to what it already
 * is.
 */
function decisionsFor(status: InspectionStatus): Decision[] {
  if (status === "REQUESTED") return ["CONFIRMED", "DECLINED"];
  if (status === "CONFIRMED") return ["COMPLETED", "DECLINED"];
  return [];
}

const STATUS_OPTIONS = inspectionStatusSchema.options;

export function IncomingInspectionsView({ scope }: { scope: "landlord" | "admin" }) {
  const isAdmin = scope === "admin";

  // "" is every status — a landlord opening this page wants what is coming up,
  // not a state to choose first.
  const [status, setStatus] = useState<InspectionStatus | "">("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{
    inspection: LandlordInspection;
    decision: Decision;
  } | null>(null);
  const [response, setResponse] = useState("");
  const [responseError, setResponseError] = useState<string | undefined>(undefined);

  const query = useIncomingInspections({ ...(status ? { status } : {}), page });
  const respond = useRespondToInspection();

  const requests = query.data?.inspections ?? [];

  function open(inspection: LandlordInspection, decision: Decision) {
    setPending({ inspection, decision });
    setResponse("");
    setResponseError(undefined);
  }

  function close() {
    setPending(null);
    setResponse("");
    setResponseError(undefined);
  }

  function confirm() {
    if (!pending) return;

    // The same schema the server applies, so a missing decline reason surfaces
    // on the field being typed into rather than as a failed request.
    const parsed = inspectionDecisionSchema.safeParse({
      status: pending.decision,
      ...(response.trim() ? { response: response.trim() } : {}),
    });
    if (!parsed.success) {
      setResponseError(parsed.error.issues.find((i) => i.path[0] === "response")?.message);
      return;
    }

    const { inspection, decision } = pending;
    respond.mutate(
      { id: inspection.id, decision: parsed.data },
      {
        onSuccess: (updated) => {
          close();
          toast.success(
            decision === "CONFIRMED"
              ? "Viewing confirmed"
              : decision === "DECLINED"
                ? "Request declined"
                : "Marked as viewed",
            {
              description:
                decision === "CONFIRMED"
                  ? `${updated.tenant.name} has been emailed${
                      updated.tenant.phone ? ` — their number is ${updated.tenant.phone}.` : "."
                    }`
                  : decision === "DECLINED"
                    ? `${updated.tenant.name} has been emailed your reason.`
                    : "Nobody was emailed — this one is just for your records.",
            },
          );
          // The last row of the last page just left the filter.
          if (requests.length === 1 && page > 1) setPage((p) => p - 1);
        },
        onError: (error) =>
          toast.error("That didn't go through", { description: messageFrom(error) }),
      },
    );
  }

  const copy = pending ? DECISIONS[pending.decision] : null;

  return (
    <main id="main">
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow={isAdmin ? "Admin" : "Inspections"}
            title={isAdmin ? "All viewing requests" : "Viewing requests"}
            lead={
              isAdmin
                ? "Every request across the platform, soonest first. Answering one here acts as the landlord would."
                : "Soonest first, so tomorrow comes before next month. What you write when you decline is all the tenant gets."
            }
            align="left"
          />

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <label htmlFor="inspection-status" className="text-sm font-medium text-ink-800">
              Showing
            </label>
            <Select
              id="inspection-status"
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
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Couldn't load your requests"
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
                  : "No viewing requests yet"
              }
              description={
                status
                  ? "Change what you're showing to see the rest."
                  : isAdmin
                    ? "Requests appear here as students ask to view listings."
                    : "When a student asks to view one of your listings, it lands here and you get an email."
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

          {requests.length > 0 && (
            <div className="flex flex-col gap-4">
              {requests.map((inspection) => (
                <RequestCard
                  key={inspection.id}
                  inspection={inspection}
                  isBusy={respond.isPending && respond.variables?.id === inspection.id}
                  onDecide={(decision) => open(inspection, decision)}
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
            <Button tone="outline" onClick={close} disabled={respond.isPending}>
              Cancel
            </Button>
            <Button
              tone={copy?.tone === "outline" ? "primary" : (copy?.tone ?? "primary")}
              onClick={confirm}
              isLoading={respond.isPending}
            >
              {copy?.confirm ?? "Confirm"}
            </Button>
          </>
        }
      >
        {pending && copy && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-medium text-ink-900">{pending.inspection.property.title}</p>
              <p className="text-ink-600">
                {pending.inspection.tenant.name} ·{" "}
                {formatDateTime(pending.inspection.preferredAt)}
              </p>
            </div>

            {/* Stated at the moment of the decision, not in a help page: a
                landlord confirming should know the number arrives because they
                confirmed, and a landlord declining should know the time is the
                tenant's to change, not theirs. */}
            {pending.decision === "CONFIRMED" && (
              <Alert tone="info">
                Confirming shares the tenant&apos;s phone number with you so you can
                reach them about the visit.
              </Alert>
            )}
            {pending.decision === "DECLINED" && pending.inspection.status === "CONFIRMED" && (
              <Alert tone="warning" title="This viewing was confirmed">
                They are expecting to come. Say what changed.
              </Alert>
            )}

            <FormField label={copy.reasonLabel} hint={copy.reasonHint} error={responseError}>
              {(field) => (
                <Textarea
                  {...field}
                  rows={4}
                  maxLength={1000}
                  value={response}
                  onChange={(event) => {
                    setResponse(event.target.value);
                    if (responseError) setResponseError(undefined);
                  }}
                  placeholder={copy.placeholder}
                />
              )}
            </FormField>
          </div>
        )}
      </Modal>
    </main>
  );
}

/**
 * One request: who is asking, when, and about which listing.
 *
 * The phone number is shown only when the server sent one, which it does only
 * once the viewing is confirmed. The absence of the field is the whole rule —
 * there is deliberately no fallback, no placeholder, and nothing else on the page
 * to pull a number from.
 */
function RequestCard({
  inspection,
  isBusy,
  onDecide,
}: {
  inspection: LandlordInspection;
  isBusy: boolean;
  onDecide: (decision: Decision) => void;
}) {
  const { label, tone } = inspectionStatusCopy[inspection.status];
  const decisions = decisionsFor(inspection.status);
  const cover = inspection.property.image;

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
                {inspection.tenant.name} wants to view {inspection.property.title}
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
              <CalendarClock aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
              {formatDateTime(inspection.preferredAt)}
            </span>
            <span>{formatNaira(inspection.property.price)} / year</span>
            <span className="text-ink-500">Asked {formatDateTime(inspection.createdAt)}</span>
          </div>

          {/* Only ever present on a confirmed viewing — see the note above. */}
          {inspection.tenant.phone && (
            <a
              href={`tel:${inspection.tenant.phone.replace(/\s+/g, "")}`}
              className="flex w-fit items-center gap-2 rounded-field bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100"
            >
              <Phone aria-hidden="true" className="size-3.5 shrink-0" />
              {inspection.tenant.phone}
            </a>
          )}

          {inspection.note && (
            <p className="flex items-start gap-2 rounded-field bg-ink-50 px-3 py-2 text-sm text-ink-700">
              <MessageSquare aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-400" />
              <span className="whitespace-pre-line">{inspection.note}</span>
            </p>
          )}

          {inspection.response && (
            <Alert
              tone={inspection.status === "CONFIRMED" ? "success" : "info"}
              title="What you told them"
            >
              {inspection.response}
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {decisions.map((decision) => {
              const { label: actionLabel, tone: actionTone, icon: Icon } = DECISIONS[decision];
              return (
                <Button
                  key={decision}
                  size="sm"
                  tone={actionTone}
                  onClick={() => onDecide(decision)}
                  disabled={isBusy}
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                  {actionLabel}
                </Button>
              );
            })}

            {decisions.length === 0 && (
              <p className="flex items-center gap-1.5 text-sm text-ink-500">
                <CalendarX aria-hidden="true" className="size-3.5 shrink-0" />
                {inspection.status === "CANCELLED"
                  ? "The tenant called this off."
                  : "Nothing left to answer."}
              </p>
            )}

            <Link
              href={`/properties/${inspection.property.id}`}
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
