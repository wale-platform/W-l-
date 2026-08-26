"use client";

import { useState } from "react";
import { ShieldCheck, Star } from "lucide-react";

import { RatingInput } from "@/components/reviews/RatingStars";
import { Alert, Button, FormField, Modal, Textarea } from "@/components/ui";
import { useCreateReview, useUpdateReview } from "@/hooks/useReviews";
import { fieldErrorsFrom, messageFrom } from "@/lib/api/field-errors";
import {
  createReviewSchema,
  updateReviewSchema,
  RATING_CRITERIA,
  type MyReview,
  type RatingKey,
} from "@/lib/api/schemas";

/**
 * Writing or revising a review of somewhere you lived.
 *
 * One component for both, because the form is the same five scores and the same
 * paragraph — only the request differs. What does not differ is that `residenceId` is
 * fixed for the life of a review: the tenancy is chosen when it is written and can
 * never be moved, so editing has nothing to pick and no picker.
 *
 * MOUNTED ONLY WHILE OPEN, and keyed by its target. That is what lets the edit case
 * seed its state straight from the review being edited — a permanently-mounted form
 * would need an effect to copy props into state and would show the previous review's
 * words for a frame. Callers render this conditionally; there is no `open` prop.
 *
 * The dialog says out loud what publishing does: whether the rating will count as
 * verified, and what a stranger will be able to see. Somebody writing about the
 * landlord who kept their deposit should know that beforehand, not discover it.
 */

export type ReviewTarget =
  | {
      kind: "new";
      propertyId: string;
      propertyTitle: string;
      /** The confirmed-or-not tenancy this review is of. Fixed from here on. */
      residenceId: string;
      /** The claim behind it is CONFIRMED, so the rating will count towards the average. */
      verified: boolean;
    }
  | { kind: "existing"; review: MyReview };

/** A stable identity for the `key` that forces a fresh form per target. */
export function reviewTargetKey(target: ReviewTarget): string {
  return target.kind === "new" ? `new:${target.residenceId}` : `edit:${target.review.id}`;
}

type Ratings = Partial<Record<RatingKey, number>>;

export function ReviewFormModal({
  target,
  onClose,
}: {
  target: ReviewTarget;
  onClose: () => void;
}) {
  const isNew = target.kind === "new";

  const [ratings, setRatings] = useState<Ratings>(() =>
    target.kind === "existing" ? { ...target.review.ratings } : {},
  );
  const [body, setBody] = useState(() =>
    target.kind === "existing" ? target.review.body : "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = useCreateReview();
  const update = useUpdateReview();
  const isPending = create.isPending || update.isPending;

  function setRating(key: RatingKey, value: number) {
    setRatings((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /** Zod issues onto the field they belong to, so each lands under its own stars. */
  function applyIssues(issues: { path: (string | number)[]; message: string }[]) {
    setErrors(
      Object.fromEntries(
        issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
      ),
    );
  }

  function onError(error: unknown) {
    // A 422 should be unreachable — the schemas here are the server's — but a 409 is
    // routine: the tenancy is already reviewed, or an admin has taken the review down.
    // Either belongs on the form, where the words are still on screen.
    const fields = fieldErrorsFrom(error);
    if (fields.length > 0) {
      setErrors(Object.fromEntries(fields.map((field) => [field.field, field.message])));
    } else {
      setErrors({ form: messageFrom(error) });
    }
  }

  function submit() {
    if (target.kind === "new") {
      const parsed = createReviewSchema.safeParse({
        residenceId: target.residenceId,
        ...ratings,
        body,
      });
      if (!parsed.success) return applyIssues(parsed.error.issues);

      setErrors({});
      create.mutate(
        { propertyId: target.propertyId, payload: parsed.data },
        { onSuccess: onClose, onError },
      );
      return;
    }

    // Every field, not a diff: they are all on screen and pre-filled, so "what changed"
    // is a question the server can answer from the row it already has.
    const parsed = updateReviewSchema.safeParse({ ...ratings, body });
    if (!parsed.success) return applyIssues(parsed.error.issues);

    setErrors({});
    update.mutate(
      { id: target.review.id, payload: parsed.data },
      { onSuccess: onClose, onError },
    );
  }

  const title = isNew ? "Review where you lived" : "Edit your review";

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={title}
      description={
        target.kind === "new"
          ? target.propertyTitle
          : target.review.property.title
      }
      footer={
        <>
          <Button tone="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={isPending}>
            {isNew ? "Publish review" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {errors.form && <Alert tone="danger">{errors.form}</Alert>}

        {/* Said before they write, not after they submit. Whether a rating counts
            towards the property's average is the difference between being heard and
            being noted, and it is decided by the landlord being reviewed. */}
        {target.kind === "new" &&
          (target.verified ? (
            <Alert tone="success" title="Your rating will count">
              The landlord confirmed you lived here, so your scores go into this
              property&apos;s verified rating.
            </Alert>
          ) : (
            <Alert tone="warning" title="Nobody has confirmed this stay yet">
              Your review will be published and shown to people looking at this place,
              marked as unconfirmed. It joins the verified rating if and when the landlord
              confirms you lived there.
            </Alert>
          ))}

        {target.kind === "existing" && (
          <p className="flex items-start gap-2 rounded-field bg-ink-50 px-3 py-2 text-xs leading-relaxed text-ink-600">
            <Star aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-ink-400" />
            Readers are shown that a review has been edited. The tenancy it is about
            cannot be changed.
          </p>
        )}

        <div className="flex flex-col">
          {RATING_CRITERIA.map(({ key, label, hint }) => (
            <RatingInput
              key={key}
              name={`rating-${key}`}
              legend={label}
              hint={hint}
              value={ratings[key]}
              onChange={(value) => setRating(key, value)}
              error={errors[key]}
            />
          ))}
        </div>

        <FormField
          label="What was it actually like?"
          required
          hint="The things a listing will not tell you: the water, the neighbours, what happened when something broke."
          error={errors.body}
        >
          {(field) => (
            <Textarea
              {...field}
              rows={6}
              maxLength={2000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Water ran most mornings but went off through Harmattan. Power was about six hours a day and there was no generator. The landlord fixed the door within a week of asking."
            />
          )}
        </FormField>

        <p className="text-xs text-ink-500">
          {body.trim().length < 30
            ? `${body.trim().length} of at least 30 characters`
            : `${body.trim().length} characters`}
        </p>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-500">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Published with your first name and last initial, and the month you moved in —
          never your full name, your account or the exact day.
        </p>
      </div>
    </Modal>
  );
}
