import { apiGet, apiPatch, apiPost } from "@/services/api";
import type { AppNotification, NotificationsListResponse } from "@/types/notification";

const BASE = "/api/notifications";

export const notificationService = {
  list: async (params?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AppNotification[]> => {
    const q = new URLSearchParams();
    if (params?.unreadOnly) q.set("unread_only", "true");
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    const data = await apiGet<NotificationsListResponse>(qs ? `${BASE}?${qs}` : BASE);
    return data.notifications ?? [];
  },

  markRead: (notificationId: string): Promise<AppNotification> =>
    apiPatch<AppNotification>(`${BASE}/${encodeURIComponent(notificationId)}/read`),

  markAllRead: (): Promise<{ updated_count?: number }> =>
    apiPost<{ updated_count?: number }>(`${BASE}/mark-all-read`),
};
