"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAnnouncement,
  useAnnouncementRevisions,
  useRecallAnnouncement,
} from "@/hooks/useAnnouncements";
import { announcementsService } from "@/services/announcementsService";
import { RecipientsDrawer } from "@/components/announcements/RecipientsDrawer";
import { toastError, toastSuccess } from "@/lib/errorToast";
import {
  Pencil,
  Users,
  Paperclip,
  History,
  ChevronDown,
  ChevronRight,
  Megaphone,
  AlertOctagon,
} from "lucide-react";
import type { AnnouncementStatus } from "@/types/announcement";

const STATUS_BADGE: Record<AnnouncementStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-emerald-100 text-emerald-700",
  recalled: "bg-amber-100 text-amber-700",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function audienceLabel(scope: string): string {
  switch (scope) {
    case "all":
      return "Everyone";
    case "roles":
      return "Selected roles";
    case "classes":
      return "Selected classes";
    case "students":
      return "Specific students";
    default:
      return scope;
  }
}

export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: announcement, isLoading, isError } = useAnnouncement(id);
  const { data: revisions = [] } = useAnnouncementRevisions(id);
  const recallMutation = useRecallAnnouncement();

  const [showRecipients, setShowRecipients] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const [recallReason, setRecallReason] = useState("");
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  if (isLoading) {
    return <div className="mx-auto max-w-4xl">Loading…</div>;
  }

  if (isError || !announcement) {
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <p className="text-muted-foreground">
          Couldn&apos;t load this announcement. It may have been deleted or you don&apos;t have access to it.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/announcements">Back to announcements</Link>
        </Button>
      </div>
    );
  }

  const onDownloadAttachment = async (attachmentId: string) => {
    try {
      const { url } = await announcementsService.downloadAttachment(attachmentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toastError(err, "Couldn't open the attachment.");
    }
  };

  const onConfirmRecall = async () => {
    if (!recallReason.trim()) {
      toastError(null, "Please provide a reason for recalling.");
      return;
    }
    try {
      await recallMutation.mutateAsync({ id, reason: recallReason.trim() });
      toastSuccess("Announcement recalled");
      setRecallOpen(false);
      setRecallReason("");
    } catch (err) {
      toastError(err, "Couldn't recall the announcement.");
    }
  };

  const canEdit =
    announcement.status === "draft" ||
    announcement.status === "scheduled" ||
    announcement.status === "published";
  const canRecall = announcement.status === "published";

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Megaphone className="size-5 text-muted-foreground" />
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {announcement.title}
            </h1>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[announcement.status]}`}
            >
              {announcement.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {announcement.author_name ?? "Unknown"} ·{" "}
            {announcement.published_at
              ? `sent ${formatDate(announcement.published_at)}`
              : announcement.scheduled_at
                ? `scheduled for ${formatDate(announcement.scheduled_at)}`
                : `last updated ${formatDate(announcement.updated_at)}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canEdit && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href={`/announcements/${id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          )}
          {canRecall && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecallOpen(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <AlertOctagon className="size-4" />
              Recall
            </Button>
          )}
        </div>
      </div>

      {/* Recall banner */}
      {announcement.status === "recalled" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-2">
            <AlertOctagon className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-medium">This announcement was recalled</p>
              {announcement.recalled_at && (
                <p className="text-sm">
                  Recalled at {formatDate(announcement.recalled_at)}
                </p>
              )}
              {announcement.recalled_reason && (
                <p className="mt-1 text-sm">
                  Reason: {announcement.recalled_reason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      {announcement.status !== "recalled" && (
        <Card>
          <CardContent className="pt-6">
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{announcement.body_markdown}</ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      )}

      {/* Meta + actions row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Audience</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>{audienceLabel(announcement.audience_json.scope)}</p>
            {announcement.audience_json.roles &&
              announcement.audience_json.roles.length > 0 && (
                <p className="mt-1 text-xs">
                  Roles: {announcement.audience_json.roles.join(", ")}
                </p>
              )}
            {announcement.audience_json.class_ids &&
              announcement.audience_json.class_ids.length > 0 && (
                <p className="mt-1 text-xs">
                  {announcement.audience_json.class_ids.length} class
                  {announcement.audience_json.class_ids.length === 1 ? "" : "es"}
                </p>
              )}
            {announcement.audience_json.student_ids &&
              announcement.audience_json.student_ids.length > 0 && (
                <p className="mt-1 text-xs">
                  {announcement.audience_json.student_ids.length} student
                  {announcement.audience_json.student_ids.length === 1 ? "" : "s"}
                </p>
              )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivery</CardTitle>
            <CardDescription className="text-xs">
              See who received and read this announcement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecipients(true)}
              className="gap-2"
              disabled={announcement.status === "draft"}
            >
              <Users className="size-4" />
              View recipients
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Attachments */}
      {announcement.attachments && announcement.attachments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {announcement.attachments.map((att) => (
                <li key={att.id}>
                  <button
                    type="button"
                    onClick={() => onDownloadAttachment(att.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {att.original_filename ?? "attachment"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(att.size_bytes)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Revisions */}
      {revisions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <button
              type="button"
              onClick={() => setRevisionsOpen((v) => !v)}
              className="flex w-full items-center gap-2 text-left"
            >
              {revisionsOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
              <History className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Revisions ({revisions.length})
              </CardTitle>
            </button>
          </CardHeader>
          {revisionsOpen && (
            <CardContent>
              <ul className="space-y-3 text-sm">
                {revisions.map((rev) => (
                  <li
                    key={rev.id}
                    className="border-l-2 border-border pl-3"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Revision {rev.revision_number} ·{" "}
                        {rev.edited_by_name ?? "Unknown"}
                      </span>
                      <span>{formatDate(rev.edited_at)}</span>
                    </div>
                    <p className="mt-1 font-medium">{rev.title}</p>
                    {rev.edit_note && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Note: {rev.edit_note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* Recall dialog */}
      <Dialog open={recallOpen} onOpenChange={setRecallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recall announcement</DialogTitle>
            <DialogDescription>
              Recipients will no longer see this announcement in their inbox.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="recall_reason">Reason</Label>
            <Input
              id="recall_reason"
              placeholder="Why are you recalling this?"
              value={recallReason}
              onChange={(e) => setRecallReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecallOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmRecall}
              disabled={recallMutation.isPending || !recallReason.trim()}
            >
              {recallMutation.isPending ? "Recalling…" : "Recall"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecipientsDrawer
        announcementId={id}
        open={showRecipients}
        onClose={() => setShowRecipients(false)}
      />
    </div>
  );
}
