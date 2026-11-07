import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications.service";
import { useAuthStore } from "@/stores/authStore";

export const NOTIFICATIONS_QUERY_ROOT = "notifications";

export const notificationKeys = {
  all: [NOTIFICATIONS_QUERY_ROOT],
  list: (perPage) => [NOTIFICATIONS_QUERY_ROOT, "list", { perPage }],
  unreadCount: () => [NOTIFICATIONS_QUERY_ROOT, "unread-count"],
};

/**
 * Paginated inbox feed. Keeps the unread counter on the first page so the
 * header and navigation badge agree without a second request.
 */
export function useNotificationsQuery({ perPage = 20, enabled = true } = {}) {
  const token = useAuthStore((state) => state.token);

  return useInfiniteQuery({
    queryKey: notificationKeys.list(perPage),
    queryFn: ({ pageParam = 1 }) => fetchNotifications({ page: pageParam, perPage }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    enabled: enabled && Boolean(token),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Lightweight unread counter for the global navigation tray.
 */
export function useUnreadNotificationCount() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const data = await fetchNotifications({ page: 1, perPage: 1 });
      return data.unreadCount;
    },
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
