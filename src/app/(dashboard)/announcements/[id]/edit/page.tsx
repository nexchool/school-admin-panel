"use client";

import { useParams } from "next/navigation";
import { useAnnouncement } from "@/hooks/useAnnouncements";
import { AnnouncementComposer } from "@/components/announcements/AnnouncementComposer";

export default function EditAnnouncementPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, isLoading } = useAnnouncement(id);

  if (isLoading || !data) {
    return <div className="mx-auto max-w-3xl">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit announcement</h1>
        <p className="text-muted-foreground">
          Update content; changes published after sending are tracked as
          revisions.
        </p>
      </div>
      <AnnouncementComposer announcementId={id} initialData={data} />
    </div>
  );
}
