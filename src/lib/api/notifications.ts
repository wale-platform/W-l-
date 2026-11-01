import { z } from "zod";

const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  read: z.boolean(),
  createdAt: z.string(),
});

const notificationListSchema = z.object({
  unreadCount: z.number().int(),
  notifications: z.array(notificationSchema),
});

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationList = z.infer<typeof notificationListSchema>;

async function request(init?: RequestInit): Promise<unknown> {
  const response = await fetch("/api/notifications", {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
        ? result.message
        : "Notifications couldn't be loaded.";
    throw new Error(message);
  }
  return result;
}

export const notificationsApi = {
  /** The signed-in user's recent notifications and unread count. */
  async list(): Promise<NotificationList> {
    return notificationListSchema.parse(await request());
  },

  async markAllAsRead(): Promise<void> {
    await request({ method: "POST", body: JSON.stringify({ all: true }) });
  },

  async markAsRead(ids: string[]): Promise<void> {
    await request({ method: "POST", body: JSON.stringify({ ids }) });
  },
};
