import { siteConfig } from "@/config/site";

/**
 * Transactional email through SendByte (https://docs.sendbyte.africa),
 * called over its HTTP API so no SDK is needed:
 *
 *   POST https://api.sendbyte.africa/v1/emails
 *   Authorization: Bearer sk_test_… | sk_live_…
 *
 * Configure `SENDBYTE_API_KEY` and `EMAIL_FROM`. A `sk_test_` (sandbox) key
 * accepts emails without delivering them; a `sk_live_` key delivers, and
 * EMAIL_FROM must then be on a domain verified in SendByte. Without a key,
 * development prints each email to the server console so reset and
 * verification links can still be followed locally; production refuses
 * rather than silently dropping the email.
 */

const SENDBYTE_ENDPOINT = "https://api.sendbyte.africa/v1/emails";
/** SendByte rate-limits per key; retry 429 / 5xx a couple of times. */
const MAX_ATTEMPTS = 3;

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("SENDBYTE_API_KEY and EMAIL_FROM must be set to send email");
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailSendError extends Error {
  constructor(status: number, code: string | undefined) {
    super(`SendByte rejected the email (${status}${code ? ` ${code}` : ""})`);
    this.name = "EmailSendError";
  }
}

interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Where replies go, e.g. the visitor who used the contact form. */
  replyTo?: string;
  /**
   * Makes retries safe: SendByte returns the original email instead of
   * sending again when it sees the same key. Defaults to a random UUID.
   */
  idempotencyKey?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.SENDBYTE_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.SENDBYTE_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") throw new EmailNotConfiguredError();
    console.info(`\n[email] (not sent — email is not configured)\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    return;
  }

  const body = JSON.stringify({
    from,
    to: [email.to],
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Replies to noreply@ mail go to the team inbox unless a caller overrides.
    ...((email.replyTo ?? process.env.CONTACT_INBOX_EMAIL)
      ? { reply_to: email.replyTo ?? process.env.CONTACT_INBOX_EMAIL }
      : {}),
    idempotency_key: email.idempotencyKey ?? crypto.randomUUID(),
  });

  for (let attempt = 1; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(SENDBYTE_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      if (attempt < MAX_ATTEMPTS) {
        await wait(attempt * 1000);
        continue;
      }
      throw error;
    }

    // 201 = queued; 200 = replay of an already-sent idempotency key.
    if (response.ok) return;

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : attempt * 1000);
      continue;
    }

    const result: unknown = await response.json().catch(() => null);
    const code =
      typeof result === "object" && result !== null && "error" in result &&
      typeof result.error === "object" && result.error !== null && "code" in result.error &&
      typeof result.error.code === "string"
        ? result.error.code
        : undefined;
    throw new EmailSendError(response.status, code);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Base URL for links in emails. Production always uses the configured site
 * URL — never the request's Host header, which an attacker could forge to
 * point a reset link at their own domain.
 */
export function appBaseUrl(request: Request): string {
  if (process.env.NODE_ENV === "production") return siteConfig.url.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** A plain, single-button email in the WALE brand colour. */
export function actionEmail({
  to,
  name,
  subject,
  intro,
  actionLabel,
  actionUrl,
  footnote,
}: {
  to: string;
  name: string;
  subject: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  footnote: string;
}): Email {
  const text = `Hi ${name},\n\n${intro}\n\n${actionLabel}: ${actionUrl}\n\n${footnote}\n\n— ${siteConfig.name}`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f1a1c">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <p style="margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:3px;color:#7a1737">WALE</p>
    <div style="background:#ffffff;border-radius:16px;padding:28px">
      <p style="margin:0 0 12px;font-size:16px">Hi ${escapeHtml(name)},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:22px">${escapeHtml(intro)}</p>
      <a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#7a1737;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${escapeHtml(actionLabel)}</a>
      <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#6b6266">${escapeHtml(footnote)}</p>
      <p style="margin:16px 0 0;font-size:12px;line-height:18px;color:#8a8286;word-break:break-all">Or paste this link into your browser:<br>${escapeHtml(actionUrl)}</p>
    </div>
  </div>
</body></html>`;
  return { to, subject, text, html };
}
