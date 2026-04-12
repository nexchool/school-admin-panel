"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timetableService } from "@/services/timetableService";

export const timetableKeys = {
  all: ["timetable"] as const,
  versions: (classId: string) => [...timetableKeys.all, "versions", classId] as const,
  bundle: (classId: string, versionId?: string | null) =>
    [...timetableKeys.all, "bundle", classId, versionId ?? "active"] as const,
  subjects: (classId: string) => [...timetableKeys.all, "subjects", classId] as const,
  teachers: (classId: string) => [...timetableKeys.all, "teachers", classId] as const,
};

export function useTimetableVersions(classId: string | null) {
  return useQuery({
    queryKey: timetableKeys.versions(classId ?? ""),
    queryFn: () => timetableService.listVersions(classId!),
    enabled: !!classId,
    select: (d) => d.items,
  });
}

export function useTimetableBundle(classId: string | null, versionId?: string | null) {
  return useQuery({
    queryKey: timetableKeys.bundle(classId ?? "", versionId),
    queryFn: () => timetableService.getBundle(classId!, versionId),
    enabled: !!classId,
  });
}

export function useClassSubjectsForTimetable(classId: string | null) {
  return useQuery({
    queryKey: timetableKeys.subjects(classId ?? ""),
    queryFn: () => timetableService.listClassSubjects(classId!),
    enabled: !!classId,
    select: (d) => d.items.filter((s) => s.status === "active"),
  });
}

export function useSubjectTeachersForTimetable(classId: string | null) {
  return useQuery({
    queryKey: timetableKeys.teachers(classId ?? ""),
    queryFn: () => timetableService.listSubjectTeachers(classId!),
    enabled: !!classId,
    select: (d) => d.items.filter((t) => t.is_active),
  });
}

export function useCreateTimetableVersion(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof timetableService.createVersion>[1]) =>
      timetableService.createVersion(classId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.versions(classId) });
    },
  });
}

export function usePatchTimetableVersion(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ versionId, body }: { versionId: string; body: Parameters<typeof timetableService.patchVersion>[2] }) =>
      timetableService.patchVersion(classId, versionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.versions(classId) });
    },
  });
}

export function useActivateTimetableVersion(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      timetableService.activateVersion(classId, versionId),
    onSuccess: (_, versionId) => {
      qc.invalidateQueries({ queryKey: timetableKeys.versions(classId) });
      qc.invalidateQueries({ queryKey: timetableKeys.bundle(classId, versionId) });
    },
  });
}

export function useCloneTimetableVersion(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: { label?: string | null }) =>
      timetableService.cloneVersion(classId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.versions(classId) });
    },
  });
}

export function useDeleteTimetableVersion(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      timetableService.deleteVersion(classId, versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.versions(classId) });
    },
  });
}

export function useCreateTimetableEntry(classId: string, versionId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof timetableService.createEntry>[1]) =>
      timetableService.createEntry(classId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.bundle(classId, versionId) });
    },
  });
}

export function usePatchTimetableEntry(classId: string, versionId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, body }: { entryId: string; body: Parameters<typeof timetableService.patchEntry>[2] }) =>
      timetableService.patchEntry(classId, entryId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.bundle(classId, versionId) });
    },
  });
}

export function useDeleteTimetableEntry(classId: string, versionId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      timetableService.deleteEntry(classId, entryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.bundle(classId, versionId) });
    },
  });
}

export function useMoveTimetableEntry(classId: string, versionId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, day, period }: { entryId: string; day: number; period: number }) =>
      timetableService.moveEntry(classId, entryId, { day_of_week: day, period_number: period }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.bundle(classId, versionId) });
    },
  });
}

export function useSwapTimetableEntries(classId: string, versionId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { entry_a_id: string; entry_b_id: string }) =>
      timetableService.swapEntries(classId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.bundle(classId, versionId) });
    },
  });
}

export function useGenerateTimetable(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: Parameters<typeof timetableService.generate>[1]) =>
      timetableService.generate(classId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timetableKeys.versions(classId) });
      qc.invalidateQueries({ queryKey: timetableKeys.all });
    },
  });
}
