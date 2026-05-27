"use client";

import { AnnouncementComposer } from "@/components/announcements/AnnouncementComposer";

export default function NewAnnouncementPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New announcement</h1>
        <p className="text-muted-foreground">
          Draft an update; you can save, schedule, or send it immediately.
        </p>
      </div>
      <AnnouncementComposer />
    </div>
  );
}
