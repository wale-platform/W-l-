"use client";

import { useState } from "react";
import { Flag, MessageSquareQuote, ShieldCheck, ShieldQuestion, Users } from "lucide-react";

import { RatingStars } from "@/components/reviews/RatingStars";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Checkbox,
  ErrorState,
  FormField,
  Modal,
  Pagination,
  Skeleton,
  Textarea,
  toast,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useExperienceSummary, usePropertyReviews, useReportReview } from "@/hooks/useReviews";
import { messageFrom } from "@/lib/api/field-errors";
import {
  RATING_CRITERIA,
  reportReviewSchema,
  type ExperienceSummary,
  type PublicReview,
} from "@/lib/api/schemas";
import { formatDate, formatMonthYear } from "@/lib/utils/format";

/**
 * What it was like to live here, on the listing page.
 *
 * The part of WALE a landlord cannot write. Everything above the fold on this page is
 * the owner's account of the place; this is the only section that is not, which is why
 * so much of the code below is about not overstating it.
 *
 * THE RATING CAN BE ABSENT, and absent is rendered as absent. `verified.averages` is
 * null until somebody with a confirmed tenancy has reviewed the place, and the summary
 * says "no rating yet" rather than drawing an empty five stars — an empty row of stars
 * reads as one out of five, which would be a rating this platform invented about
 * somebody's home.
 *
 * UNCONFIRMED REVIEWS ARE SHOWN AND LABELLED. They are excluded from the average and
 * carry a badge saying so, on every card. Hiding them would hand the landlord being
 * reviewed a mute button, since they are the one who confirms; folding them into the
 * average would make the confirmation step decorative. Both mistakes are one line away
 * and neither is made here.
 *
 * Client-rendered, unlike the rest of the page. Reviews are paginated, filterable, and
 * `mine` depends on the session — three reasons a server render would be a snapshot
 * that goes stale on the first interaction. The listing itself stays server-rendered so
 * a shared link still unfurls.
 */
export function PropertyReviews({ propertyId }: { propertyId: string }) {
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [reporting, setReporting] = useState<PublicReview | null>(null);

  const summary = useExperienceSummary(propertyId);
  const list = usePropertyReviews(propertyId, { page, verifiedOnly });
  const { isAuthenticated } = useAuth();

  const reviews = list.data?.reviews ?? [];

  return (
    <section id="reviews" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink-900">What it&apos;s like to live here</h2>
        <p className="text-sm text-ink-500">
          Written by people who lived in this place, not by whoever listed it.
        </p>
      </div>

      {summary.isPending && <Skeleton className="h-40" />}

      {/* A failed summary is not a failed section. The reviews below stand on their own,
          so the aggregate is simply missing rather than taking the list down with it. */}
      {summary.isError && (
        <Alert tone="warning" title="Couldn't load the rating">
          {messageFrom(summary.error, "The reviews below are unaffected.")}
        </Alert>
      )}

      {summary.data && <SummaryCard summary={summary.data} />}

      {/* Only offered when there is something on both sides of it to compare. */}
      {summary.data &&
        summary.data.verified.count > 0 &&
        summary.data.unverifiedCount > 0 && (
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-700">
            <Checkbox
              checked={verifiedOnly}
              onChange={(event) => {
                setVerifiedOnly(event.target.checked);
                setPage(1);
              }}
            />
            Only show stays the landlord confirmed
          </label>
        )}

      {list.isPending && (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}

      {list.isError && (
        <ErrorState
          title="Couldn't load the reviews"
          description={messageFrom(list.error, "Check your connection and try again.")}
          action={
            <Button tone="outline" onClick={() => void list.refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {list.isSuccess && reviews.length === 0 && (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-10 text-center">
            <MessageSquareQuote aria-hidden="true" className="size-5 text-ink-400" />
            <p className="font-medium text-ink-800">
              {verifiedOnly ? "No confirmed reviews yet" : "Nobody has reviewed this place yet"}
            </p>
            <p className="max-w-md text-sm text-ink-500">
              {verifiedOnly
                ? "Untick the filter to read the ones the landlord has not confirmed."
                : "If you have lived here, add it to your residence history — once the landlord confirms it you can write the review you wish you had read."}
            </p>
          </CardBody>
        </Card>
      )}

      {reviews.length > 0 && (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <ReviewCard
                review={review}
                canReport={isAuthenticated && !review.mine}
                onReport={() => setReporting(review)}
              />
            </li>
          ))}
        </ul>
      )}

      {list.data && list.data.totalPages > 1 && (
        <Pagination
          page={list.data.page}
          totalPages={list.data.totalPages}
          onPageChange={setPage}
          className="justify-center"
        />
      )}

      {reporting && (
        <ReportReviewModal review={reporting} onClose={() => setReporting(null)} />
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- the rating -- */

/**
 * The aggregate above the list.
 *
 * Three numbers that are deliberately not one: the average over confirmed stays, how
 * many voices that average leaves out, and how many people the landlord has agreed
 * lived here at all. "Four people have lived here, one has reviewed it" is a more
 * honest summary than one review shown alone.
 */
function SummaryCard({ summary }: { summary: ExperienceSummary }) {
  const averages = summary.verified.averages;

  return (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {averages ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold text-ink-900">
                {averages.overall.toFixed(1)}
              </span>
              <div className="flex flex-col gap-1">
                <RatingStars value={averages.overall} size="lg" />
                <span className="text-sm text-ink-500">
                  {summary.verified.count} confirmed{" "}
                  {summary.verified.count === 1 ? "review" : "reviews"}
                </span>
              </div>
            </div>
          ) : (
            /* No stars at all. An empty row would read as one out of five. */
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-ink-800">No rating yet</span>
              <span className="text-sm text-ink-500">
                A rating appears once someone the landlord has confirmed lived here
                reviews the place.
              </span>
            </div>
          )}

          <div className="flex flex-col items-start gap-1.5 text-sm text-ink-600">
            {summary.residents > 0 && (
              <span className="flex items-center gap-1.5">
                <Users aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
                {summary.residents} confirmed{" "}
                {summary.residents === 1 ? "resident" : "residents"}
              </span>
            )}
            {summary.unverifiedCount > 0 && (
              <span className="flex items-center gap-1.5">
                <ShieldQuestion aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
                {summary.unverifiedCount} unconfirmed, not counted above
              </span>
            )}
          </div>
        </div>

        {averages && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {RATING_CRITERIA.filter((criterion) => criterion.key !== "overall").map(
              ({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-ink-600">{label}</dt>
                  <dd className="flex items-center gap-2">
                    <RatingStars value={averages[key]} size="sm" />
                    <span className="w-7 text-right text-sm font-medium text-ink-800">
                      {averages[key].toFixed(1)}
                    </span>
                  </dd>
                </div>
              ),
            )}
          </dl>
        )}
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ one review -- */

/** "September 2024 – August 2025", from month-precision dates. */
function period(review: PublicReview): string {
  const from = formatMonthYear(review.residedFrom);
  return review.residedTo ? `${from} – ${formatMonthYear(review.residedTo)}` : `${from} – present`;
}

function ReviewCard({
  review,
  canReport,
  onReport,
}: {
  review: PublicReview;
  canReport: boolean;
  onReport: () => void;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink-900">{review.author.name}</span>
              {/* On every card, both ways round. A reader who sees a "confirmed" badge
                  on some cards and nothing on others has to guess what nothing means. */}
              {review.verified ? (
                <Badge tone="success">
                  <ShieldCheck aria-hidden="true" className="size-3" />
                  Landlord confirmed this stay
                </Badge>
              ) : (
                <Badge tone="warning">
                  <ShieldQuestion aria-hidden="true" className="size-3" />
                  Stay not confirmed
                </Badge>
              )}
              {review.mine && <Badge tone="outline">Yours</Badge>}
            </div>
            <p className="text-sm text-ink-500">
              Lived here {period(review)} · wrote this {formatDate(review.createdAt)}
              {review.edited && " · edited"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <RatingStars value={review.ratings.overall} />
            <span className="text-sm font-medium text-ink-800">
              {review.ratings.overall}/5
            </span>
          </div>
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

        {canReport && (
          <div className="flex justify-end">
            <Button size="sm" tone="ghost" onClick={onReport}>
              <Flag aria-hidden="true" className="size-3.5" />
              Report
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ----------------------------------------------------------------- reporting -- */

/**
 * Telling an admin something is wrong with a review.
 *
 * The dialog says plainly that this does not take the review down, because the person
 * most likely to reach for it is the landlord being criticised — and a report that
 * quietly hid a review would make every rating on the platform worthless. It goes into a
 * queue a human reads. That is the whole of it, and saying so up front is better than
 * letting somebody submit expecting otherwise.
 */
function ReportReviewModal({
  review,
  onClose,
}: {
  review: PublicReview;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const report = useReportReview();

  function submit() {
    const parsed = reportReviewSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Say what is wrong with it.");
      return;
    }

    setError(undefined);
    report.mutate(
      { id: review.id, payload: parsed.data },
      {
        onSuccess: () => {
          onClose();
          toast.success("Reported", {
            description: "An admin will read it. The review stays up until they decide.",
          });
        },
        // A 409 here is routine — you have already reported this one, or it is your
        // own. Both are the server's words and both belong on the form.
        onError: (mutationError) => setError(messageFrom(mutationError)),
      },
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Report this review"
      description={`Written by ${review.author.name}`}
      footer={
        <>
          <Button tone="outline" onClick={onClose} disabled={report.isPending}>
            Cancel
          </Button>
          <Button tone="danger" onClick={submit} isLoading={report.isPending}>
            Send to an admin
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Alert tone="info" title="This does not hide the review">
          Reporting puts it in front of an admin, who decides. Nothing about the review
          changes in the meantime — including for the person who wrote it.
        </Alert>

        <FormField
          label="What is wrong with it?"
          required
          hint="An admin reads this. “It is not true — this person never lived here” is something they can act on; “inappropriate” is not."
          error={error}
        >
          {(field) => (
            <Textarea
              {...field}
              rows={4}
              maxLength={1000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="This review is about a different building — the address given was never let to this person."
            />
          )}
        </FormField>
      </div>
    </Modal>
  );
}
