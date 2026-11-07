import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { acquireSocket, releaseSocket } from "@/lib/socket";
import {
  notificationKeys,
  NOTIFICATIONS_QUERY_ROOT,
} from "@/hooks/useNotifications";

const NOTIFICATION_EVENTS = [
  "new_notification",
  "notification",
  "event_created",
  "user_joined_event",
  "event_updated",
];

function normalizeNotification(payload = {}) {
  const raw = payload.notification ?? payload.data?.notification ?? payload;

  if (!raw?.id) return null;

  return {
    ...raw,
    id: String(raw.id),
    is_read: Boolean(raw.is_read),
    metadata: raw.metadata ?? {},
  };
}

/**
 * Prepends a live notification into every cached infinite inbox variant while
 * keeping pagination totals and the page-level unread counter coherent.
 */
export function prependNotificationToCache(oldData, notification) {
  if (!oldData || !Array.isArray(oldData.pages)) return oldData;

  return {
    ...oldData,
    pages: oldData.pages.map((page, index) => {
      if (index !== 0) return page;

      const current = Array.isArray(page.notifications) ? page.notifications : [];

      if (
        current.some(
          (candidate) => String(candidate?.id) === String(notification.id),
        )
      ) {
        return page;
      }

      const previousTotal = Number(page.pagination?.total ?? current.length);
      const perPage = Number(page.pagination?.perPage ?? 20);
      const total = previousTotal + 1;

      return {
        ...page,
        notifications: [notification, ...current],
        pagination: {
          ...page.pagination,
          total,
          totalPages:
            perPage > 0
              ? Math.ceil(total / perPage)
              : (page.pagination?.totalPages ?? 0),
        },
        unreadCount:
          Number(page.unreadCount ?? 0) + (notification.is_read ? 0 : 1),
      };
    }),
  };
}

/**
 * Joins `user_notifications:<user_id>` with the authenticated bearer token.
 *
 * A `new_notification` push carries the persisted row, so the inbox cache is
 * patched in place (no refetch, no page refresh) and the shared unread-count
 * query is incremented for the global navigation badge. Older event-style
 * pushes fall back to a cache invalidation because they do not include the
 * persisted notification payload.
 *
 * The socket is reference-counted, so leaving the screen tears the channel down
 * and disconnects the shared socket once no other channel needs it.
 */
export function useNotificationChannel({ token, userId, enabled = true } = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !token || !userId) return undefined;

    const socket = acquireSocket(token);
    if (!socket) return undefined;

    const topic = `user_notifications:${userId}`;
    const channel = socket.channel(topic, {});

    const handleNewNotification = (payload) => {
      const notification = normalizeNotification(payload);

      if (!notification) {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        return;
      }

      queryClient.setQueriesData(
        { queryKey: [NOTIFICATIONS_QUERY_ROOT, "list"] },
        (oldData) => prependNotificationToCache(oldData, notification),
      );

      if (!notification.is_read) {
        queryClient.setQueryData(notificationKeys.unreadCount(), (current) =>
          typeof current === "number" ? current + 1 : current,
        );
      }
    };

    const handleLegacyNotification = () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    channel.on("new_notification", handleNewNotification);

    NOTIFICATION_EVENTS.filter((eventName) => eventName !== "new_notification").forEach(
      (eventName) => {
        channel.on(eventName, handleLegacyNotification);
      },
    );

    channel.join().receive("error", (reason) => {
      console.warn("Unable to join user notification channel", reason);
    });

    return () => {
      channel.leave();
      releaseSocket();
    };
  }, [enabled, token, userId, queryClient]);

  return notificationKeys.all;
}

export default useNotificationChannel;
