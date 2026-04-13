import { apiGet, apiPatch, apiPost } from "@/services/api";
import type { AppNotification, NotificationsListResponse } from "@/types/notification";

const BASE = "/api/notifications";

export const NOTIFICATION_PAGE_SIZE = 20;

export const notificationService = {
  list: async (params?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationsListResponse> => {
    const q = new URLSearchParams();
    if (params?.unreadOnly) q.set("unread_only", "true");
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.offset != null) q.set("offset", String(params.offset));
    const qs = q.toString();
    const data = await apiGet<NotificationsListResponse>(qs ? `${BASE}?${qs}` : BASE);
    const notifications = Array.isArray(data.notifications) ? data.notifications : [];
    const p = data.pagination;
    const pagination = {
      total: typeof p?.total === "number" ? p.total : notifications.length,
      limit: typeof p?.limit === "number" ? p.limit : NOTIFICATION_PAGE_SIZE,
      offset: typeof p?.offset === "number" ? p.offset : 0,
      has_more: Boolean(p?.has_more),
    };
    return { notifications, pagination };
  },

  getById: async (id: string): Promise<AppNotification> => {
    const data = await apiGet<{ notification?: AppNotification }>(
      `${BASE}/${encodeURIComponent(id)}`
    );
    if (!data.notification) throw new Error("Notification not found");
    return data.notification;
  },

  markRead: (notificationId: string): Promise<AppNotification> =>
    apiPatch<AppNotification>(`${BASE}/${encodeURIComponent(notificationId)}/read`),

  markAllRead: (): Promise<{ updated_count?: number }> =>
    apiPost<{ updated_count?: number }>(`${BASE}/mark-all-read`),
};
