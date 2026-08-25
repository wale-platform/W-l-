import nodemailer, { type Transporter } from "nodemailer";

import { env } from "../config/env";
import { logger } from "./logger";

/**
 * Transactional email abstraction.
 *
 * Two transports behind one interface:
 *  - "log"  (default): renders the email to the logger, including any action
 *           link, so local development needs no mail server and no verification
 *           link is ever silently lost. This is the zero-config dev path.
 *  - "smtp": real delivery via Nodemailer, configured from SMTP_* env vars.
 *
 * Callers use the small helpers (sendVerificationEmail, sendPasswordResetEmail)
 * rather than composing MIME here, so message copy lives in one place.
 */

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

let smtpTransport: Transporter | null = null;

function getSmtpTransport(): Transporter {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }
  return smtpTransport;
}

export async function sendMail(mail: Mail): Promise<void> {
  if (env.EMAIL_TRANSPORT === "smtp") {
    await getSmtpTransport().sendMail({ from: env.EMAIL_FROM, ...mail });
    return;
  }

  // "log" transport — never send, just record. Logged at info so the developer
  // can copy verification/reset links straight from the console.
  logger.info(
    { email: { to: mail.to, subject: mail.subject, body: mail.text } },
    "📧 [email:log] outgoing email (not actually sent)",
  );
}

// ───────────────────────────────────────────────────────── Message helpers ──

export function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const subject = "Verify your Wale Housing email";
  const text = [
    "Welcome to Wale Housing!",
    "",
    "Please confirm your email address by opening the link below:",
    verifyUrl,
    "",
    "This link expires in 24 hours. If you didn't create an account, ignore this email.",
  ].join("\n");
  return sendMail({ to, subject, text });
}

export function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const subject = "Reset your Wale Housing password";
  const text = [
    "We received a request to reset your Wale Housing password.",
    "",
    "Reset it using the link below:",
    resetUrl,
    "",
    "This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.",
  ].join("\n");
  return sendMail({ to, subject, text });
}

/**
 * Tell a landlord what happened to their listing.
 *
 * Sent on every admin decision, because a review the owner never hears about is
 * indistinguishable from no review at all — they would keep refreshing a
 * dashboard to find out.
 *
 * `reason` is the reviewer's own words, passed through unchanged. For a rejection
 * it is the only thing that tells them what to fix, so it is not summarised, and
 * it is why the schema requires one.
 */
export function sendListingDecisionEmail(args: {
  to: string;
  title: string;
  status: "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  reason?: string;
  listingUrl: string;
}): Promise<void> {
  const { to, title, status, reason, listingUrl } = args;

  const copy = {
    VERIFIED: {
      subject: `Your listing is live: ${title}`,
      lead: [
        `Good news — "${title}" has been verified and is now live on Wale Housing.`,
        "",
        "Students can find it in search, and it carries the verified badge.",
      ],
    },
    REJECTED: {
      subject: `Your listing needs a change: ${title}`,
      lead: [
        `We reviewed "${title}" and it can't go live as it stands.`,
        "",
        "What our reviewer said:",
      ],
    },
    SUSPENDED: {
      subject: `Your listing has been taken down: ${title}`,
      lead: [
        `"${title}" has been taken down and is no longer visible to students.`,
        "",
        "Why:",
      ],
    },
    PENDING_VERIFICATION: {
      subject: `Your listing is back under review: ${title}`,
      lead: [`"${title}" has been put back into the review queue.`],
    },
  }[status];

  const text = [
    ...copy.lead,
    ...(reason ? ["", reason] : []),
    "",
    status === "REJECTED"
      ? "Update it and send it back for review here:"
      : "See the listing here:",
    listingUrl,
    "",
    status === "SUSPENDED"
      ? "If you think this is a mistake, reply to this email and we'll take another look."
      : "",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n")
    .trimEnd();

  return sendMail({ to, subject: copy.subject, text });
}

/**
 * How a viewing time reads in an email.
 *
 * Formatted in Africa/Lagos explicitly rather than in the server's zone, because
 * the server may be anywhere and "10:00" shifting by an hour is the difference
 * between a landlord being at the gate and not. Both parties are in Nigeria; if
 * that stops being true this becomes a per-user preference, not a server default.
 */
function viewingTime(at: Date): string {
  return at.toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Tell a landlord somebody wants to see their place.
 *
 * The point of the email is that it is actionable away from the dashboard: a
 * landlord reads it on their phone and needs the time and the tenant's note
 * right there, not a "you have a notification" nudge that requires a login to
 * decipher.
 *
 * The tenant's phone number is deliberately NOT here. It reaches the landlord
 * once they confirm the viewing — see inspection.serializer.ts — and an email is
 * forwarded far more casually than a dashboard is shared.
 */
export function sendInspectionRequestEmail(args: {
  to: string;
  title: string;
  preferredAt: Date;
  note?: string;
  queueUrl: string;
}): Promise<void> {
  const { to, title, preferredAt, note, queueUrl } = args;

  const text = [
    `Somebody wants to view "${title}".`,
    "",
    `They asked for: ${viewingTime(preferredAt)}`,
    ...(note ? ["", `Their note: ${note}`] : []),
    "",
    "Confirm the time or suggest another one here:",
    queueUrl,
    "",
    "Once you confirm, we'll share their phone number so you can reach them.",
  ].join("\n");

  return sendMail({ to, subject: `Viewing request: ${title}`, text });
}

/**
 * Tell a tenant whether the viewing is on.
 *
 * `response` is the landlord's own words, passed through unchanged. On a decline
 * it is the only thing that says whether to propose another time or look
 * elsewhere, which is why the schema requires one.
 *
 * The confirmation repeats the safety line from the listing page. It is the same
 * warning, on purpose: this email arrives at the exact moment somebody might be
 * asked to "secure the viewing" with a transfer, and that is when it is worth
 * reading rather than when it was scrolled past on a listing.
 */
export function sendInspectionDecisionEmail(args: {
  to: string;
  title: string;
  status: "CONFIRMED" | "DECLINED";
  preferredAt: Date;
  response?: string;
  listingUrl: string;
}): Promise<void> {
  const { to, title, status, preferredAt, response, listingUrl } = args;

  const confirmed = status === "CONFIRMED";
  const text = [
    confirmed
      ? `Your viewing of "${title}" is confirmed for ${viewingTime(preferredAt)}.`
      : `The landlord can't do ${viewingTime(preferredAt)} for "${title}".`,
    ...(response ? ["", `What they said: ${response}`] : []),
    "",
    confirmed ? "The listing:" : "You can ask for another time here:",
    listingUrl,
    ...(confirmed
      ? [
          "",
          "Never pay to inspect. No inspection fee, caution fee, or agreement fee should be paid before you have seen the place and met the landlord.",
        ]
      : []),
  ].join("\n");

  return sendMail({
    to,
    subject: confirmed ? `Viewing confirmed: ${title}` : `Viewing not confirmed: ${title}`,
    text,
  });
}
