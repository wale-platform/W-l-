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
