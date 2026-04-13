"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  NOTIFICATION_PAGE_SIZE,
  notificationService,
} from "@/services/notificationService";
import type { AppNotification } from "@/types/notification";

export const notificationKeys = {
  all: ["notifications"] as const,
  feed: (unreadOnly: boolean) => [...notificationKeys.all, "feed", unreadOnly] as const,
  detail: (id: string) => [...notificationKeys.all, "detail", id] as const,
  unreadTotal: () => [...notificationKeys.all, "unread-total"] as const,
};

/**
 * Paginated inbox (SSE + invalidations refresh pages). No polling.
 */
export function useNotificationFeed(unreadOnly = false) {
  return useInfiniteQuery({
    queryKey: notificationKeys.feed(unreadOnly),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      notificationService.list({
        unreadOnly,
        limit: NOTIFICATION_PAGE_SIZE,
        offset: pageParam as number,
      }),
    getNextPageParam: (last) =>
      last.pagination.has_more
        ? last.pagination.offset + last.pagination.limit
        : undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useNotificationDetail(id: string | undefined) {
  return useQuery({
    queryKey: notificationKeys.detail(id ?? ""),
    queryFn: () => notificationService.getById(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useUnreadNotificationsCount() {
  const { data: total = 0 } = useQuery({
    queryKey: notificationKeys.unreadTotal(),
    queryFn: async () => {
      const res = await notificationService.list({
        unreadOnly: true,
        limit: 1,
        offset: 0,
      });
      return res.pagination.total;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  return total;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nid: string) => notificationService.markRead(nid),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function flattenNotificationPages(
  data: { pages: { notifications: AppNotification[] }[] } | undefined
): AppNotification[] {
  if (!data?.pages?.length) return [];
  return data.pages.flatMap((p) => p.notifications);
}
