import { api } from "@/lib/api";

function unwrap(payload) {
  return payload?.data ?? payload ?? {};
}

function toCount(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Loads one page of the authenticated user's notification inbox.
 */
export async function fetchNotifications({ page = 1, perPage = 20 } = {}) {
  const payload = await api.get(
    `/api/v1/notifications?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(perPage)}`,
  );
  const data = unwrap(payload);
  const pagination = data.pagination ?? {};

  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    pagination: {
      page: toCount(pagination.page, page),
      perPage: toCount(pagination.per_page, perPage),
      total: toCount(pagination.total),
      totalPages: toCount(pagination.total_pages),
    },
    unreadCount: toCount(data.unread_count),
  };
}

/**
 * Marks one owned notification as read.
 */
export async function markNotificationRead(id) {
  const payload = await api.patch(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
  );
  const data = unwrap(payload);

  return {
    notification: data.notification ?? null,
    unreadCount: toCount(data.unread_count),
  };
}

/**
 * Bulk-marks every unread notification owned by the signed-in user as read.
 */
export async function markAllNotificationsRead() {
  const payload = await api.post("/api/v1/notifications/mark-all-read");
  const data = unwrap(payload);

  return {
    updated: toCount(data.updated),
    unreadCount: toCount(data.unread_count),
  };
}
