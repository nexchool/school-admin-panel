import {
  apiGet,
  apiPost,
  apiPatch,
  apiPostForm,
  apiDelete,
} from "@/services/api";
import type {
  Announcement,
  AnnouncementAttachment,
  AnnouncementRevision,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
  RecipientRoster,
  SystemTemplate,
} from "@/types/announcement";

function unwrap<T>(data: T | { data: T }): T {
  if (Array.isArray(data)) return data as T;
  if (data && typeof data === "object" && "data" in (data as object)) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export const announcementsService = {
  list: async (params?: { status?: string; search?: string }): Promise<Announcement[]> => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString();
    const data = await apiGet<Announcement[] | { data: Announcement[] }>(
      `/api/announcements${qs ? "?" + qs : ""}`,
    );
    return unwrap(data);
  },
  get: async (id: string): Promise<Announcement> => {
    const data = await apiGet<Announcement | { data: Announcement }>(
      `/api/announcements/${id}`,
    );
    return unwrap(data);
  },
  revisions: async (id: string): Promise<AnnouncementRevision[]> => {
    const data = await apiGet<AnnouncementRevision[] | { data: AnnouncementRevision[] }>(
      `/api/announcements/${id}/revisions`,
    );
    return unwrap(data);
  },
  recipients: async (id: string, page = 1): Promise<RecipientRoster> => {
    const data = await apiGet<RecipientRoster | { data: RecipientRoster }>(
      `/api/announcements/${id}/recipients?page=${page}`,
    );
    return unwrap(data);
  },
  inbox: async (): Promise<Announcement[]> => {
    const data = await apiGet<Announcement[] | { data: Announcement[] }>(
      "/api/announcements/inbox",
    );
    return unwrap(data);
  },
  templates: async (): Promise<SystemTemplate[]> => {
    const data = await apiGet<SystemTemplate[] | { data: SystemTemplate[] }>(
      "/api/announcements/templates",
    );
    return unwrap(data);
  },

  create: async (payload: CreateAnnouncementPayload): Promise<Announcement> => {
    const data = await apiPost<Announcement | { data: Announcement }>(
      "/api/announcements",
      payload,
    );
    return unwrap(data);
  },
  update: async (
    id: string,
    payload: UpdateAnnouncementPayload,
  ): Promise<Announcement> => {
    const data = await apiPatch<Announcement | { data: Announcement }>(
      `/api/announcements/${id}`,
      payload,
    );
    return unwrap(data);
  },
  publish: async (id: string): Promise<Announcement> => {
    const data = await apiPost<Announcement | { data: Announcement }>(
      `/api/announcements/${id}/publish`,
      {},
    );
    return unwrap(data);
  },
  schedule: async (id: string, scheduled_at: string): Promise<Announcement> => {
    const data = await apiPost<Announcement | { data: Announcement }>(
      `/api/announcements/${id}/schedule`,
      { scheduled_at },
    );
    return unwrap(data);
  },
  unschedule: async (id: string): Promise<Announcement> => {
    const data = await apiPost<Announcement | { data: Announcement }>(
      `/api/announcements/${id}/unschedule`,
      {},
    );
    return unwrap(data);
  },
  recall: async (id: string, reason: string): Promise<Announcement> => {
    const data = await apiPost<Announcement | { data: Announcement }>(
      `/api/announcements/${id}/recall`,
      { reason },
    );
    return unwrap(data);
  },

  uploadAttachment: async (
    file: File,
    announcement_id?: string,
  ): Promise<AnnouncementAttachment> => {
    const form = new FormData();
    form.append("file", file);
    if (announcement_id) form.append("announcement_id", announcement_id);
    const data = await apiPostForm<
      AnnouncementAttachment | { data: AnnouncementAttachment }
    >("/api/announcements/attachments", form);
    return unwrap(data);
  },
  deleteAttachment: (id: string) =>
    apiDelete(`/api/announcements/attachments/${id}`),
  downloadAttachment: async (id: string): Promise<{ url: string }> => {
    const data = await apiGet<{ url: string } | { data: { url: string } }>(
      `/api/announcements/attachments/${id}/download`,
    );
    return unwrap(data);
  },
};
