"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AudiencePicker } from "./AudiencePicker";
import { AttachmentsField } from "./AttachmentsField";
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
  usePublishAnnouncement,
  useScheduleAnnouncement,
  useUnscheduleAnnouncement,
  useTemplates,
} from "@/hooks/useAnnouncements";
import { toastSuccess, toastError } from "@/lib/errorToast";
import { ChevronDown } from "lucide-react";
import type {
  Announcement,
  AnnouncementAttachment,
  AudienceJson,
} from "@/types/announcement";

import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// ── Schema ────────────────────────────────────────────────────────────────────

const audienceSchema = z
  .object({
    scope: z.enum(["all", "roles", "classes", "students"]),
    roles: z.array(z.enum(["admin", "teacher", "student", "parent"])).optional(),
    class_ids: z.array(z.string()).optional(),
    student_ids: z.array(z.string()).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.scope === "roles" && (!val.roles || val.roles.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick at least one role",
      });
    }
    if (val.scope === "classes" && (!val.class_ids || val.class_ids.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick at least one class",
      });
    }
    if (
      val.scope === "students" &&
      (!val.student_ids || val.student_ids.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick at least one student",
      });
    }
  });

const composeSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body_markdown: z.string().trim().min(1, "Body is required"),
  audience: audienceSchema,
});

type ComposeInput = z.infer<typeof composeSchema>;

interface Props {
  announcementId?: string;
  initialData?: Announcement;
}

export function AnnouncementComposer({ announcementId, initialData }: Props) {
  const router = useRouter();
  const isEdit = !!announcementId;

  const initialAudience: AudienceJson = initialData?.audience_json ?? { scope: "all" };

  const {
    control,
    handleSubmit,
    register,
    formState: { errors, isDirty },
    setValue,
    setError,
    getValues,
  } = useForm<ComposeInput>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      body_markdown: initialData?.body_markdown ?? "",
      audience: initialAudience,
    },
  });

  const [attachments, setAttachments] = useState<AnnouncementAttachment[]>(
    initialData?.attachments ?? [],
  );
  const [currentId, setCurrentId] = useState<string | undefined>(announcementId);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [templateConfirm, setTemplateConfirm] = useState<
    { title: string; body_markdown: string } | null
  >(null);

  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement(currentId ?? "");
  const publishMutation = usePublishAnnouncement();
  const scheduleMutation = useScheduleAnnouncement();
  const unscheduleMutation = useUnscheduleAnnouncement();
  const { data: templates = [] } = useTemplates();

  const status = initialData?.status;
  const isPublished = status === "published";
  const isScheduled = status === "scheduled";
  const isRecalled = status === "recalled";

  const persist = async (values: ComposeInput): Promise<Announcement> => {
    const payload = {
      title: values.title,
      body_markdown: values.body_markdown,
      audience_json: values.audience,
    };
    if (currentId) {
      return await updateMutation.mutateAsync(payload);
    }
    const created = await createMutation.mutateAsync(payload);
    setCurrentId(created.id);
    return created;
  };

  const mapServerErrors = (err: unknown) => {
    // Surface server validation onto a field if shape matches
    const e = err as { data?: { details?: Array<{ field: string; issue: string }> } };
    const details = e?.data?.details;
    if (Array.isArray(details)) {
      for (const d of details) {
        if (d.field === "title" || d.field === "body_markdown") {
          setError(d.field as "title" | "body_markdown", {
            type: "server",
            message: d.issue,
          });
        }
      }
    }
  };

  const onSaveDraft = handleSubmit(async (values) => {
    try {
      const saved = await persist(values);
      toastSuccess(isEdit ? "Draft updated" : "Draft saved");
      if (!isEdit) router.push(`/announcements/${saved.id}/edit`);
    } catch (err) {
      mapServerErrors(err);
      toastError(err, "Couldn't save the draft.");
    }
  });

  const onSendNow = handleSubmit(async (values) => {
    try {
      const saved = await persist(values);
      await publishMutation.mutateAsync(saved.id);
      toastSuccess("Announcement sent");
      router.push(`/announcements/${saved.id}`);
    } catch (err) {
      mapServerErrors(err);
      toastError(err, "Couldn't send the announcement.");
    }
  });

  const openSchedule = () => {
    setScheduleAt(initialData?.scheduled_at?.slice(0, 16) ?? "");
    setScheduleOpen(true);
  };

  const submitSchedule = handleSubmit(async (values) => {
    if (!scheduleAt) {
      toastError(null, "Please pick a date and time.");
      return;
    }
    try {
      const saved = await persist(values);
      await scheduleMutation.mutateAsync({
        id: saved.id,
        scheduled_at: new Date(scheduleAt).toISOString(),
      });
      toastSuccess("Announcement scheduled");
      setScheduleOpen(false);
      router.push(`/announcements/${saved.id}`);
    } catch (err) {
      mapServerErrors(err);
      toastError(err, "Couldn't schedule.");
    }
  });

  const onUnschedule = async () => {
    if (!currentId) return;
    try {
      await unscheduleMutation.mutateAsync(currentId);
      toastSuccess("Schedule cancelled");
      router.push(`/announcements/${currentId}`);
    } catch (err) {
      toastError(err, "Couldn't cancel the schedule.");
    }
  };

  const applyTemplate = (tpl: { title: string; body_markdown: string }) => {
    const current = getValues();
    const dirty =
      (current.title?.trim().length ?? 0) > 0 ||
      (current.body_markdown?.trim().length ?? 0) > 0;
    if (dirty) {
      setTemplateConfirm(tpl);
    } else {
      setValue("title", tpl.title, { shouldDirty: true });
      setValue("body_markdown", tpl.body_markdown, { shouldDirty: true });
    }
  };

  const confirmApplyTemplate = () => {
    if (!templateConfirm) return;
    setValue("title", templateConfirm.title, { shouldDirty: true });
    setValue("body_markdown", templateConfirm.body_markdown, { shouldDirty: true });
    setTemplateConfirm(null);
  };

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    publishMutation.isPending ||
    scheduleMutation.isPending;

  const audienceError = useMemo(() => {
    const e = errors.audience as unknown as { message?: string } | undefined;
    return e?.message;
  }, [errors.audience]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-5 pt-6">
          {/* Header row: template picker */}
          <div className="flex items-center justify-end">
            {templates.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="gap-2">
                    Templates
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Insert template</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {templates.map((tpl) => (
                    <DropdownMenuItem
                      key={tpl.id}
                      onClick={() =>
                        applyTemplate({
                          title: tpl.title,
                          body_markdown: tpl.body_markdown,
                        })
                      }
                    >
                      {tpl.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What's this announcement about?"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Body markdown */}
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Controller
              control={control}
              name="body_markdown"
              render={({ field }) => (
                <div data-color-mode="light">
                  <MDEditor
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? "")}
                    height={320}
                    preview="edit"
                  />
                </div>
              )}
            />
            {errors.body_markdown && (
              <p className="text-sm text-destructive">
                {errors.body_markdown.message}
              </p>
            )}
          </div>

          {/* Audience */}
          <Controller
            control={control}
            name="audience"
            render={({ field }) => (
              <AudiencePicker
                value={field.value}
                onChange={field.onChange}
                error={audienceError}
              />
            )}
          />

          {/* Attachments */}
          <AttachmentsField
            attachments={attachments}
            announcementId={currentId}
            onAdded={(att) => setAttachments((cur) => [...cur, att])}
            onRemoved={(id) =>
              setAttachments((cur) => cur.filter((a) => a.id !== id))
            }
          />
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {isRecalled && (
          <span className="mr-auto text-sm text-muted-foreground">
            This announcement was recalled. Edits are read-only.
          </span>
        )}

        {!isPublished && !isRecalled && (
          <Button
            type="button"
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save draft"}
          </Button>
        )}

        {isScheduled && (
          <Button
            type="button"
            variant="outline"
            onClick={onUnschedule}
            disabled={isSaving}
          >
            Cancel schedule
          </Button>
        )}

        {!isPublished && !isRecalled && (
          <Button
            type="button"
            variant="outline"
            onClick={openSchedule}
            disabled={isSaving}
          >
            {isScheduled ? "Reschedule" : "Schedule"}
          </Button>
        )}

        {isPublished ? (
          <Button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        ) : !isRecalled ? (
          <Button type="button" onClick={onSendNow} disabled={isSaving}>
            {isSaving ? "Sending…" : "Send now"}
          </Button>
        ) : null}
      </div>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_at">Send at</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitSchedule} disabled={isSaving || !scheduleAt}>
              {isSaving ? "Scheduling…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template overwrite confirm */}
      <Dialog
        open={!!templateConfirm}
        onOpenChange={(o) => !o && setTemplateConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace current content?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Applying this template will overwrite the title and body you have so
            far.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={confirmApplyTemplate}>Replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
