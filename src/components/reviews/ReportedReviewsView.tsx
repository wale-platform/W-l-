"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  Inbox,
  MapPin,
  Trash2,
  User,
} from "lucide-react";

import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { RatingStars } from "@/components/reviews/RatingStars";
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
import { useModerateReview, useReportedReviews } from "@/hooks/useReviews";
import { messageFrom } from "@/lib/api/field-errors";
import {
  moderateReviewSchema,
  RATING_CRITERIA,
  reviewStatusCopy,
  type ReportedReview,
  type ReviewStatus,
} from "@/lib/api/schemas";
import { formatDate } from "@/lib/utils/format";

/**
 * Complaints about reviews, and what an admin does with them.
 *
 * The queue that makes the report button mean anything. Everything on this screen is
 * arranged around one asymmetry: a review is somebody's account of their own home, and
 * the person most motivated to get it taken down is the landlord it criticises. So a
 * report is a request for a human to read the review, and this page shows the review in
 * full — the words, all five scores, who wrote it — beside the complaint about it,
 * because the complaint on its own is only ever one side.
 *
 * NOTHING WAS HIDDEN BY THE REPORT. Reports do not change a review's status; that only
 * happens here, deliberately, by a person. Which is why the default filter is the
 * outstanding ones and the resolved ones stay reachable: the queue is auditable after
 * the fact rather than emptied.
 *
 * PUBLISHED is offered as an outcome, not just the two ways of taking something down.
 * "I read this and it stands" is the most common honest answer to a report, and a
 * moderation screen that only offers hide and remove quietly pushes towards removal.
 *
 * The note an admin writes is logged on the server, not stored on the review. The form
 * says so, because a moderator writing a justification should know whether it will be
 * there in six months.
 */
export function ReportedReviewsView() {
  // Outstanding first: a queue is a list of things waiting on somebody.
  const [resolved, setResolved] = useState(false);
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState<ReportedReview | null>(null);

  const query = useReportedReviews({ page, resolved });
  const reports = query.data?.reviews ?? [];

  return (
    <main id="main">
      <Section>
        <Container size="wide" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Admin"
            title="Reported reviews"
            lead="Somebody objected to a review. Read it, then decide — reporting it changed nothing on its own, and leaving it published is a real answer."
            align="left"
          />

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <label htmlFor="report-state" className="text-sm font-medium text-ink-800">
              Showing
            </label>
            <Select
              id="report-state"
              value={resolved ? "resolved" : "open"}
              onChange={(event) => {
                setResolved(event.target.value === "resolved");
                setPage(1);
              }}
            >
              <option value="open">Waiting on a decision</option>
              <option value="resolved">Already decided</option>
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
              title="Couldn't load the reports"
              description={messageFrom(query.error, "Check your connection and try again.")}
              action={
                <Button tone="outline" onClick={() => void query.refetch()}>
                  Try again
                </Button>
              }
            />
          )}

          {query.isSuccess && reports.length === 0 && (
            <EmptyState
              icon={<Inbox aria-hidden="true" className="size-5" />}
              title={resolved ? "Nothing decided yet" : "Nothing waiting on you"}
              description={
                resolved
                  ? "Reports you have acted on appear here, with what was decided."
                  : "When somebody reports a review, it lands here. Nothing about the review changes until you decide."
              }
            />
          )}

          {reports.length > 0 && (
            <div className="flex flex-col gap-4">
              {reports.map((report) => (
                <ReportCard
                  key={report.reportId}
                  report={report}
                  onDecide={() => setDeciding(report)}
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

      {deciding && (
        <ModerateModal
          key={deciding.reportId}
          report={deciding}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            // The row leaves the outstanding list; step back if it was the last one.
            if (reports.length === 1 && page > 1) setPage((p) => p - 1);
          }}
        />
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ one report -- */

/**
 * The complaint and the review it is about, side by side.
 *
 * The review gets the space, and the complaint is quoted verbatim in a box that says
 * whose words they are. Somebody skimming this queue at speed should not be able to
 * mistake the accusation for a finding.
 */
function ReportCard({
  report,
  onDecide,
}: {
  report: ReportedReview;
  onDecide: () => void;
}) {
  const { review } = report;
  const status = reviewStatusCopy[review.status];
  const open = report.resolvedAt === undefined;

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-base font-semibold text-ink-900">
              <Link
                href={`/properties/${review.property.id}#reviews`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:text-brand-700 hover:underline"
              >
                {review.property.title}
              </Link>
            </h3>
            <p className="flex items-center gap-1.5 text-sm text-ink-500">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              {review.property.address}, {review.property.city}, {review.property.state}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            {review.verified && <Badge tone="brand">Confirmed tenancy</Badge>}
            {!open && <Badge tone="neutral">Decided</Badge>}
          </div>
        </div>

        {/* The complaint. Quoted, attributed, and visually separate from the review —
            it is one person's claim about another person's words. */}
        <div className="flex flex-col gap-1.5 rounded-field border border-warning/30 bg-warning-subtle px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-ink-800">
            <Flag aria-hidden="true" className="size-3.5 shrink-0 text-warning" />
            {report.reporter.name} reported this on {formatDate(report.reportedAt)}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
            {report.reason}
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-field border border-ink-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm text-ink-700">
              <User aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
              <span className="font-medium text-ink-900">{review.author.name}</span>
              <span className="text-ink-500">wrote this {formatDate(review.createdAt)}</span>
            </p>
            <span className="flex items-center gap-2">
              <RatingStars value={review.ratings.overall} />
              <span className="text-sm font-medium text-ink-800">
                {review.ratings.overall}/5
              </span>
            </span>
          </div>

          <p className="whitespace-pre-line leading-relaxed text-ink-700">{review.body}</p>

          <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-100 pt-3">
            {RATING_CRITERIA.filter((criterion) => criterion.key !== "overall").map(
              ({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <dt className="text-xs text-ink-500">{label}</dt>
                  <dd>
                    <RatingStars value={review.ratings[key]} size="sm" />
                  </dd>
                </div>
              ),
            )}
          </dl>
        </div>

        {!open && report.resolvedAt && (
          <p className="text-sm text-ink-500">
            Decided on {formatDate(report.resolvedAt)}. The review is{" "}
            {status.label.toLowerCase()}.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onDecide}>
            {open ? "Decide on this" : "Change the decision"}
          </Button>
          <Link
            href={`/properties/${review.property.id}#reviews`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" tone="ghost">
              View listing
            </Button>
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------- the decision -- */

const OUTCOMES: {
  value: ReviewStatus;
  label: string;
  detail: string;
  icon: typeof Eye;
}[] = [
  {
    value: "PUBLISHED",
    label: "Leave it up",
    detail:
      "You read it and it stands. Counts towards the rating if the tenancy was confirmed. Restores a review that was hidden.",
    icon: Eye,
  },
  {
    value: "HIDDEN",
    label: "Hide it",
    detail:
      "Off the listing and out of every average. The author is told, and can no longer edit it. Reversible.",
    icon: EyeOff,
  },
  {
    value: "REMOVED",
    label: "Take it down",
    detail:
      "For breaking the rules outright. Off the listing, out of every average, and the author is told. Use hiding for anything you might revisit.",
    icon: Trash2,
  },
];

/**
 * Deciding what happens to a reported review.
 *
 * Every outcome states its consequence next to it, because the three differ in ways a
 * one-word label does not carry: whether the author can still edit, whether it counts
 * towards a rating, and whether the decision can be walked back. An admin choosing
 * between "hide" and "remove" is choosing between reversible and not.
 *
 * Deciding resolves every outstanding report on that review, not only this one, and the
 * dialog says how many. The server does it in a single transaction; saying nothing would
 * leave an admin wondering why the queue shortened by more than one.
 */
function ModerateModal({
  report,
  onClose,
  onDone,
}: {
  report: ReportedReview;
  onClose: () => void;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<ReviewStatus>(report.review.status);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const moderate = useModerateReview();

  function submit() {
    const parsed = moderateReviewSchema.safeParse({ status, note });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Couldn't record that.");
      return;
    }

    setError(undefined);
    moderate.mutate(
      { id: report.review.id, payload: parsed.data },
      {
        onSuccess: (result) => {
          onDone();
          toast.success(`Review ${reviewStatusCopy[result.status].label.toLowerCase()}`, {
            description:
              result.reportsResolved === 1
                ? "One report closed."
                : `${result.reportsResolved} reports on this review closed.`,
          });
        },
        onError: (mutationError) => setError(messageFrom(mutationError)),
      },
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Decide on this review"
      description={`By ${report.review.author.name}, about ${report.review.property.title}`}
      footer={
        <>
          <Button tone="outline" onClick={onClose} disabled={moderate.isPending}>
            Cancel
          </Button>
          <Button
            tone={status === "PUBLISHED" ? "primary" : "danger"}
            onClick={submit}
            isLoading={moderate.isPending}
          >
            {status === "PUBLISHED" ? "Leave it up" : "Apply decision"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <Alert tone="info" title="Closing this closes every report on this review">
          Whichever way you decide, all outstanding complaints about it are marked as
          handled. Nothing has changed about the review so far.
        </Alert>

        <fieldset className="flex flex-col gap-2">
          <legend className="pb-1 text-sm font-medium text-ink-800">
            What happens to it
          </legend>
          {OUTCOMES.map(({ value, label, detail, icon: Icon }) => (
            <label
              key={value}
              className={
                "flex cursor-pointer items-start gap-3 rounded-field border p-3 transition-colors " +
                (status === value
                  ? "border-brand-400 bg-brand-50/60"
                  : "border-ink-200 hover:border-brand-300")
              }
            >
              <input
                type="radio"
                name="moderation-status"
                value={value}
                checked={status === value}
                onChange={() => setStatus(value)}
                className="mt-1 shrink-0 accent-brand-600"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                  <Icon aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
                  {label}
                  {value === report.review.status && (
                    <span className="text-xs font-normal text-ink-500">(current)</span>
                  )}
                </span>
                <span className="text-xs leading-relaxed text-ink-600">{detail}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <FormField
          label="Why (optional)"
          hint="Logged on the server for the audit trail. It is not stored on the review and neither the author nor the reporter is shown it."
        >
          {(field) => (
            <Textarea
              {...field}
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Checked the residence claim — the dates match and the landlord confirmed it. The complaint is a disagreement with the review, not a reason to hide it."
            />
          )}
        </FormField>

        {status === "REMOVED" && (
          <p className="flex items-start gap-2 rounded-field bg-danger-subtle px-3 py-2 text-xs leading-relaxed text-ink-800">
            <Trash2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-danger" />
            Taking a review down deletes somebody&apos;s account of their own home from
            the listing. If there is any chance the complaint is the landlord objecting
            to criticism, hide it instead — that can be undone.
          </p>
        )}

        {status === "PUBLISHED" && report.review.status !== "PUBLISHED" && (
          <p className="flex items-start gap-2 rounded-field bg-success-subtle px-3 py-2 text-xs leading-relaxed text-ink-800">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-success" />
            This puts the review back on the listing and lets its author edit it again.
          </p>
        )}
      </div>
    </Modal>
  );
}
