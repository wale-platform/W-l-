import type { Request, Response } from "express";

import { sendMail } from "../../lib/email";
import { sendSuccess } from "../../lib/http";
import type { ContactInput } from "./contact.schemas";

/**
 * Contact controller.
 *
 * Dispatches the enquiry through the email abstraction (logged in dev, sent via
 * SMTP in production) and returns `{ message }` — the exact shape the frontend
 * contact form already expects. The submitter's address is set as reply-to so a
 * team member can respond directly.
 *
 * Persistence (a ContactMessage table + an admin inbox) is a deliberate later
 * addition; we don't model tables before there's a consumer for them.
 */

const CONTACT_INBOX = "hello@walehousing.ng";

export async function submit(req: Request, res: Response): Promise<void> {
  const input = req.body as ContactInput;

  const text = [
    `New contact enquiry via Wale Housing`,
    ``,
    `Name:    ${input.name}`,
    `Email:   ${input.email}`,
    `Phone:   ${input.phone ?? "—"}`,
    `Subject: ${input.subject}`,
    ``,
    input.message,
  ].join("\n");

  await sendMail({
    to: CONTACT_INBOX,
    subject: `[Contact] ${input.subject}`,
    text,
    replyTo: input.email,
  });

  sendSuccess(res, {
    message: "Thanks for reaching out — we'll get back to you shortly.",
  });
}
