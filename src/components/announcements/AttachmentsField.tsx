"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import {
  useUploadAnnouncementAttachment,
  useDeleteAnnouncementAttachment,
} from "@/hooks/useAnnouncements";
import { toastError } from "@/lib/errorToast";
import type { AnnouncementAttachment } from "@/types/announcement";

interface Props {
  attachments: AnnouncementAttachment[];
  announcementId?: string;
  onAdded: (att: AnnouncementAttachment) => void;
  onRemoved: (id: string) => void;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsField({
  attachments,
  announcementId,
  onAdded,
  onRemoved,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadAnnouncementAttachment();
  const deleteMutation = useDeleteAnnouncementAttachment();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file
    for (const file of files) {
      try {
        const att = await uploadMutation.mutateAsync({
          file,
          announcement_id: announcementId,
        });
        onAdded(att);
        toast.success(`Uploaded ${file.name}`);
      } catch (err) {
        toastError(err, `Failed to upload ${file.name}`);
      }
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      onRemoved(id);
    } catch (err) {
      toastError(err, "Failed to delete attachment");
    }
  };

  return (
    <div className="space-y-2">
      <Label>Attachments</Label>
      <div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="gap-2"
        >
          <Paperclip className="size-4" />
          {uploadMutation.isPending ? "Uploading…" : "Add file"}
        </Button>
      </div>

      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {att.original_filename ?? "attachment"}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(att.size_bytes)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDelete(att.id)}
                className="ml-2 rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove attachment"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
