"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";
import type { AppNotification } from "@/types/notification";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (unreadOnly?: boolean) => [...notificationKeys.all, "list", { unreadOnly }] as const,
};

/** Fetch all notifications, polling every 30 s for the unread count badge. */
export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: () => notificationService.list({ unreadOnly, limit: 50 }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/** Derived: unread count from the full list (no extra request). */
export function useUnreadNotificationsCount() {
  const { data } = useNotifications(false);
  const count = (data ?? []).filter((n: AppNotification) => !n.read_at).length;
  return count;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
