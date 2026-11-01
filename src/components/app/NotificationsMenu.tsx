"use client";

import { useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { notificationsApi, type Notification } from "@/lib/api/notifications";
import { cn } from "@/lib/utils/cn";
import { notificationsKey } from "./query-keys";
import { useDropdown } from "./use-dropdown";

/** Latest notifications shown in the dropdown; the rest live on /notifications. */
const PREVIEW_COUNT = 6;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

/**
 * Header bell: shows the unread count and opens a dropdown of recent
 * notifications, with a link to the full notification centre.
 */
export function NotificationsMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const panelId = useId();
  const { open, container, trigger, toggle, close } = useDropdown();

  const { data, isPending, isError } = useQuery({
    queryKey: notificationsKey,
    queryFn: notificationsApi.list,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const unread = data?.unreadCount ?? 0;
  const preview = data?.notifications.slice(0, PREVIEW_COUNT) ?? [];

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });

  const openNotification = (notification: Notification) => {
    if (!notification.read) {
      void notificationsApi
        .markAsRead([notification.id])
        .then(() => queryClient.invalidateQueries({ queryKey: notificationsKey }));
    }
    close();
    if (notification.link) router.push(notification.link);
  };

  return (
    <div ref={container} className="sm:relative">
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className={cn(
          "relative rounded-full p-2 text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900",
          open && "bg-ink-50 text-ink-900",
        )}
      >
        <Bell aria-hidden="true" className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "z-50 flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[0_24px_60px_-16px_rgba(14,17,16,0.25)]",
            // Full-width sheet under the header on phones, anchored dropdown from sm up.
            "fixed inset-x-3 top-[4.25rem] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96",
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3">
            <p className="text-sm font-bold text-ink-900">
              Notifications
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">
                  {unread} new
                </span>
              )}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="flex items-center gap-1 text-xs font-semibold text-brand-800 hover:underline disabled:opacity-60"
              >
                <CheckCheck aria-hidden="true" className="size-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,26rem)] overflow-y-auto">
            {isError ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">Notifications couldn&apos;t be loaded.</p>
            ) : isPending ? (
              <p className="px-4 py-8 text-center text-sm text-ink-500">Loading…</p>
            ) : preview.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-800">
                  <Bell aria-hidden="true" className="size-5" />
                </span>
                <p className="text-sm font-semibold text-ink-900">You&apos;re all caught up</p>
                <p className="text-xs text-ink-500">New updates will appear here.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5 p-1.5">
                {preview.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-ink-50",
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
                        <span className={cn("block text-sm text-ink-900", !notification.read && "font-semibold")}>
                          {notification.title}
                          {!notification.read && <span className="sr-only"> (unread)</span>}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-600">{notification.body}</span>
                        <time dateTime={notification.createdAt} className="mt-1 block text-[11px] text-ink-400">
                          {timeAgo(notification.createdAt)}
                        </time>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-ink-100 p-2">
            <Link
              href="/notifications"
              onClick={close}
              className="flex w-full items-center justify-center rounded-full bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-900"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
