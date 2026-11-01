import { CONTACT_TOPICS, contactFormSchema } from "@/lib/api/schemas";
import { siteConfig } from "@/config/site";
import { ensureSchema, getSql } from "@/lib/server/db";
import { escapeHtml, sendEmail } from "@/lib/server/email";
import { logActivity } from "@/lib/server/activity";
import {
  getCurrentUser,
  jsonResponse,
  readJsonBody,
  serverErrorResponse,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Messages one email address may send per hour. */
const HOURLY_LIMIT = 5;

const SUCCESS = { message: "Thanks for reaching out. Our team replies within one working day." };

/**
 * Contact-page enquiries. Validated with the same Zod schema as the form,
 * saved to `contact_messages` so nothing is lost, then forwarded to the
 * team inbox (`CONTACT_INBOX_EMAIL`, defaulting to the public contact
 * address) with Reply-To set to the sender.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);

  // Honeypot: a hidden field people never fill in but form-filling bots do.
  // Pretend it worked so the bot has no signal to adapt to.
  if (typeof body === "object" && body !== null && "website" in body && body.website) {
    return jsonResponse(SUCCESS);
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonResponse({ message: first.message, field: String(first.path[0] ?? "") }, 422);
  }
  const data = { ...parsed.data, email: parsed.data.email.toLowerCase() };

  try {
    await ensureSchema();
    const sql = getSql();

    const recent = (await sql`
      SELECT COUNT(*)::int AS count FROM contact_messages
      WHERE email = ${data.email} AND created_at > NOW() - INTERVAL '1 hour'
    `) as { count: number }[];
    if (recent[0].count >= HOURLY_LIMIT) {
      return jsonResponse(
        { message: "You've sent several messages recently. Please wait a while before sending another." },
        429,
      );
    }

    // Link the message to the account when the sender is signed in.
    const user = await getCurrentUser().catch(() => null);

    await sql`
      INSERT INTO contact_messages (topic, name, email, phone, subject, message, user_id)
      VALUES (${data.topic}, ${data.name}, ${data.email}, ${data.phone ?? null},
              ${data.subject}, ${data.message}, ${user?.id ?? null})
    `;
    await logActivity(user?.id ?? null, "contact.message", `Contact message from ${data.name} <${data.email}>: ${data.subject}`);
  } catch (error) {
    return serverErrorResponse("contact", error);
  }

  // The message is saved, so a failed notification shouldn't fail the request.
  try {
    await notifyTeam(data);
  } catch (error) {
    console.error("[contact] Notification email failed", error instanceof Error ? error.name : "UnknownError");
  }

  return jsonResponse(SUCCESS);
}

async function notifyTeam(data: {
  topic: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}) {
  const topicLabel = CONTACT_TOPICS.find((topic) => topic.value === data.topic)?.label ?? data.topic;
  const details: [string, string][] = [
    ["Topic", topicLabel],
    ["From", `${data.name} <${data.email}>`],
    ["Phone", data.phone ?? "Not given"],
  ];

  await sendEmail({
    to: process.env.CONTACT_INBOX_EMAIL || siteConfig.contact.email,
    replyTo: data.email,
    subject: `[WALE contact] ${data.subject}`,
    text: `${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\n${data.message}`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f1a1c">
      <table style="font-size:14px;margin-bottom:16px">${details
        .map(([label, value]) => `<tr><td style="padding:2px 12px 2px 0;color:#6b6266">${label}</td><td>${escapeHtml(value)}</td></tr>`)
        .join("")}</table>
      <p style="font-size:15px;line-height:22px;white-space:pre-wrap">${escapeHtml(data.message)}</p>
    </div>`,
  });
}
