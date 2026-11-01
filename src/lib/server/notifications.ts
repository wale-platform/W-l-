import { getSql } from "./db";

/**
 * In-app notifications shown under the header bell. Creating one never
 * throws: a failed notification must not fail the action that caused it.
 */
export async function notify(
  userId: string,
  notification: { title: string; body: string; link?: string },
): Promise<void> {
  try {
    await getSql()`
      INSERT INTO notifications (user_id, title, body, link)
      VALUES (${userId}, ${notification.title.slice(0, 150)}, ${notification.body}, ${notification.link ?? null})
    `;
  } catch (error) {
    console.error("[notifications] Failed to create notification", error instanceof Error ? error.name : "UnknownError");
  }
}
