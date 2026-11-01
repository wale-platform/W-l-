"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { notificationsKey } from "@/components/app/query-keys";
import { Button, Card, ErrorState, Skeleton, toast } from "@/components/ui";
import { notificationsApi, type Notification } from "@/lib/api/notifications";
import { cn } from "@/lib/utils/cn";

const timeFormat = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: notificationsKey,
    queryFn: notificationsApi.list,
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
    onError: (error: Error) => toast.error("Couldn't update notifications", { description: error.message }),
  });

  const open = (notification: Notification) => {
    if (!notification.read) {
      // Fire and forget: opening the link shouldn't wait on this.
      void notificationsApi
        .markAsRead([notification.id])
        .then(() => queryClient.invalidateQueries({ queryKey: notificationsKey }));
    }
    if (notification.link) router.push(notification.link);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Notifications</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Notification centre</h1>
          <p className="mt-1 text-sm text-ink-600">
            Updates on your account, payments, listings and inspections.
          </p>
        </div>
        {data && data.unreadCount > 0 && (
          <Button
            tone="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            isLoading={markAll.isPending}
            loadingText="Updating…"
          >
            <CheckCheck aria-hidden="true" className="size-4" /> Mark all as read
          </Button>
        )}
      </div>

      {isError ? (
        <ErrorState
          title="Notifications couldn't be loaded"
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      ) : isPending ? (
        <Card className="divide-y divide-ink-100">
          {[0, 1, 2].map((key) => (
            <div key={key} className="flex flex-col gap-2 p-5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </Card>
      ) : data.notifications.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-800">
            <Bell aria-hidden="true" className="size-7" />
          </span>
          <h2 className="text-lg font-semibold text-ink-900">No notifications yet</h2>
          <p className="max-w-md text-sm leading-6 text-ink-500">
            Payment receipts, verification updates and inspection news will appear here.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-ink-100">
            {data.notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => open(notification)}
                  className={cn(
                    "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-ink-50",
                    !notification.read && "bg-brand-50/40",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      notification.read ? "bg-transparent" : "bg-brand-700",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className={cn("text-sm text-ink-900", !notification.read && "font-semibold")}>
                        {notification.title}
                        {!notification.read && <span className="sr-only"> (unread)</span>}
                      </span>
                      <time dateTime={notification.createdAt} className="text-xs text-ink-500">
                        {timeFormat.format(new Date(notification.createdAt))}
                      </time>
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-ink-600">{notification.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
