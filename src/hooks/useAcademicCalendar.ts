"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { holidayKeys } from "@/hooks/useHolidays";
import {
  academicCalendarService,
  type AcademicCalendar,
  type CalendarImportType,
  type CalendarPreferences,
  type ExamWindow,
  type SchoolEvent,
  type WeeklyHolidaysConfig,
} from "@/services/academicCalendarService";
import { useAuth } from "@/components/providers/AuthProvider";

export const academicCalendarKeys = {
  all: ["academic-calendar"] as const,
  calendar: (academicYearId?: string) =>
    [...academicCalendarKeys.all, "state", academicYearId ?? "none"] as const,
  summary: (calendarId?: string) =>
    [...academicCalendarKeys.all, "summary", calendarId ?? "none"] as const,
  days: (calendarId?: string) =>
    [...academicCalendarKeys.all, "days", calendarId ?? "none"] as const,
  examWindows: (academicYearId?: string) =>
    [...academicCalendarKeys.all, "exam-windows", academicYearId ?? "none"] as const,
  events: (academicYearId?: string) =>
    [...academicCalendarKeys.all, "events", academicYearId ?? "none"] as const,
};

function invalidateCalendar(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: academicCalendarKeys.all });
}

export function useAcademicCalendarState(academicYearId?: string) {
  const { tenantId } = useAuth();
  return useQuery<AcademicCalendar | null>({
    queryKey: [...academicCalendarKeys.calendar(academicYearId), tenantId],
    queryFn: () => academicCalendarService.getCalendar(academicYearId!),
    enabled: !!tenantId && !!academicYearId,
  });
}

export function useCalendarSummary(calendarId?: string) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...academicCalendarKeys.summary(calendarId), tenantId],
    queryFn: () => academicCalendarService.getSummary(calendarId!),
    enabled: !!tenantId && !!calendarId,
  });
}

export function useCalendarDays(calendarId?: string) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...academicCalendarKeys.days(calendarId), tenantId],
    queryFn: () => academicCalendarService.getDays(calendarId!),
    enabled: !!tenantId && !!calendarId,
  });
}

export function useExamWindows(academicYearId?: string) {
  const { tenantId } = useAuth();
  return useQuery<ExamWindow[]>({
    queryKey: [...academicCalendarKeys.examWindows(academicYearId), tenantId],
    queryFn: () => academicCalendarService.listExamWindows(academicYearId!),
    enabled: !!tenantId && !!academicYearId,
  });
}

export function useSchoolEvents(academicYearId?: string) {
  const { tenantId } = useAuth();
  return useQuery<SchoolEvent[]>({
    queryKey: [...academicCalendarKeys.events(academicYearId), tenantId],
    queryFn: () => academicCalendarService.listEvents(academicYearId!),
    enabled: !!tenantId && !!academicYearId,
  });
}

export function useCreateCalendarDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (academicYearId: string) =>
      academicCalendarService.createDraft(academicYearId),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useUpdateCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        current_step?: number;
        weekly_holidays_config?: WeeklyHolidaysConfig;
      };
    }) => academicCalendarService.updateCalendar(id, data),
    onSuccess: () => {
      invalidateCalendar(qc);
      // Weekly-holiday config changes sync recurring holiday rows server-side.
      qc.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}

export function usePublishCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academicCalendarService.publish(id),
    onSuccess: () => {
      invalidateCalendar(qc);
      // Publish materializes 2nd/4th-Saturday holiday rows.
      qc.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}

export function useCreateExamWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ExamWindow>) =>
      academicCalendarService.createExamWindow(data),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useUpdateExamWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExamWindow> }) =>
      academicCalendarService.updateExamWindow(id, data),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useDeleteExamWindow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academicCalendarService.deleteExamWindow(id),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useCreateSchoolEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SchoolEvent>) =>
      academicCalendarService.createEvent(data),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useUpdateSchoolEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SchoolEvent> }) =>
      academicCalendarService.updateEvent(id, data),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useDeleteSchoolEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academicCalendarService.deleteEvent(id),
    onSuccess: () => invalidateCalendar(qc),
  });
}

// ── Admin lifecycle + import ────────────────────────────────────────────────

export function useDeleteCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academicCalendarService.deleteCalendar(id),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useArchiveCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academicCalendarService.archiveCalendar(id),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useRestoreCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academicCalendarService.restoreCalendar(id),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useUpdateCalendarPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, prefs }: { id: string; prefs: Partial<CalendarPreferences> }) =>
      academicCalendarService.updatePreferences(id, prefs),
    onSuccess: () => invalidateCalendar(qc),
  });
}

export function useCalendarActivity(calendarId?: string, page = 1, enabled = true) {
  const { tenantId } = useAuth();
  return useQuery({
    queryKey: [...academicCalendarKeys.all, "activity", calendarId ?? "none", page, tenantId],
    queryFn: () => academicCalendarService.getActivity(calendarId!, page),
    enabled: !!tenantId && !!calendarId && enabled,
  });
}

export function useImportCalendarData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      type,
      file,
    }: {
      id: string;
      type: CalendarImportType;
      file: File;
    }) => academicCalendarService.importData(id, type, file),
    onSuccess: () => {
      invalidateCalendar(qc);
      // Import may add holidays / vacations, which have their own cache.
      qc.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}
