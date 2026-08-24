export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const defaultNotifications: Notification[] = [
  {
    id: "notif-001",
    title: "Inspection Approved",
    body: "Your inspection request for 'Modern self-contained studio at Tanke' has been approved for August 25th.",
    read: false,
    createdAt: "2026-08-18T10:05:00.000Z",
  },
  {
    id: "notif-002",
    title: "Welcome to WALE",
    body: "Thanks for creating your account. Complete your student profile to receive tailored hostel suggestions.",
    read: true,
    createdAt: "2026-08-17T09:00:00.000Z",
  },
];

export const notificationsApi = {
  /**
   * Get list of notification items for the current student.
   */
  async list(): Promise<Notification[]> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return defaultNotifications;
  },

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead(): Promise<{ success: boolean }> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { success: true };
  },
};
