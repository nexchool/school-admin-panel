"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAnnouncement } from "@/hooks/useAnnouncements";
import { AnnouncementComposer } from "@/components/announcements/AnnouncementComposer";

export default function EditAnnouncementPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, isLoading, isError } = useAnnouncement(id);

  if (isLoading) {
    return <div className="mx-auto max-w-3xl">Loading…</div>;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-muted-foreground">
          Couldn&apos;t load this announcement to edit. It may have been deleted or you don&apos;t have access to it.
        </p>
        <Link href="/announcements" className="mt-4 inline-block text-sm underline">
          Back to announcements
        </Link>
      </div>
    );
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
