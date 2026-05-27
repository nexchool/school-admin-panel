"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { announcementsService } from "@/services/announcementsService";
import { useAuth } from "@/components/providers/AuthProvider";
import type {
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
} from "@/types/announcement";

export const announcementsKeys = {
  all: ["announcements"] as const,
  list: (status?: string, search?: string) =>
    ["announcements", "list", status ?? "", search ?? ""] as const,
  detail: (id: string) => ["announcements", "detail", id] as const,
  inbox: () => ["announcements", "inbox"] as const,
  revisions: (id: string) => ["announcements", "revisions", id] as const,
  recipients: (id: string) => ["announcements", "recipients", id] as const,
  templates: () => ["announcements", "templates"] as const,
};

export function useAnnouncementsList(status?: string, search?: string) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...announcementsKeys.list(status, search), tenantId],
    queryFn: () => announcementsService.list({ status, search }),
    enabled: !!tenantId,
  });
}

export function useAnnouncement(id: string | undefined, enabled = true) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...announcementsKeys.detail(id ?? ""), tenantId],
    queryFn: () => announcementsService.get(id!),
    enabled: enabled && !!id && !!tenantId,
  });
}

export function useInbox() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...announcementsKeys.inbox(), tenantId],
    queryFn: () => announcementsService.inbox(),
    enabled: !!tenantId,
  });
}

export function useAnnouncementRevisions(id: string | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...announcementsKeys.revisions(id ?? ""), tenantId],
    queryFn: () => announcementsService.revisions(id!),
    enabled: !!id && !!tenantId,
  });
}

export function useAnnouncementRecipients(id: string | undefined) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...announcementsKeys.recipients(id ?? ""), tenantId],
    queryFn: () => announcementsService.recipients(id!),
    enabled: !!id && !!tenantId,
  });
}

export function useTemplates() {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...announcementsKeys.templates(), tenantId],
    queryFn: () => announcementsService.templates(),
    staleTime: 5 * 60 * 1000,
    enabled: !!tenantId,
  });
}

function useInvalidatingMutation<TVar, TRes = unknown>(
  fn: (v: TVar) => Promise<TRes>,
) {
  const qc = useQueryClient();
  return useMutation<TRes, unknown, TVar>({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: announcementsKeys.all }),
  });
}

export function useCreateAnnouncement() {
  return useInvalidatingMutation<CreateAnnouncementPayload>((p) =>
    announcementsService.create(p),
  );
}

export function useUpdateAnnouncement(id: string) {
  return useInvalidatingMutation<UpdateAnnouncementPayload>((p) =>
    announcementsService.update(id, p),
  );
}

export function usePublishAnnouncement() {
  return useInvalidatingMutation<string>((id) =>
    announcementsService.publish(id),
  );
}

export function useScheduleAnnouncement() {
  return useInvalidatingMutation<{ id: string; scheduled_at: string }>(
    ({ id, scheduled_at }) => announcementsService.schedule(id, scheduled_at),
  );
}

export function useUnscheduleAnnouncement() {
  return useInvalidatingMutation<string>((id) =>
    announcementsService.unschedule(id),
  );
}

export function useRecallAnnouncement() {
  return useInvalidatingMutation<{ id: string; reason: string }>(
    ({ id, reason }) => announcementsService.recall(id, reason),
  );
}

export function useUploadAnnouncementAttachment() {
  return useInvalidatingMutation<{ file: File; announcement_id?: string }>(
    ({ file, announcement_id }) =>
      announcementsService.uploadAttachment(file, announcement_id),
  );
}

export function useDeleteAnnouncementAttachment() {
  return useInvalidatingMutation<string>((id) =>
    announcementsService.deleteAttachment(id),
  );
}
