"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAnnouncementsList } from "@/hooks/useAnnouncements";
import { Plus, Megaphone, Clock, FileEdit } from "lucide-react";
import type { Announcement, AnnouncementStatus } from "@/types/announcement";

type TabKey = "published" | "scheduled" | "draft";

const TAB_LABEL: Record<TabKey, string> = {
  published: "Sent",
  scheduled: "Scheduled",
  draft: "Drafts",
};

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

function AnnouncementCard({ a }: { a: Announcement }) {
  const timestamp =
    a.status === "published"
      ? a.published_at
      : a.status === "scheduled"
        ? a.scheduled_at
        : a.updated_at;
  return (
    <Link
      href={`/announcements/${a.id}`}
      className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-foreground">{a.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {a.body_markdown}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[a.status]}`}
        >
          {a.status}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{a.author_name ?? "Unknown"}</span>
        <span aria-hidden>·</span>
        <span>{formatDate(timestamp)}</span>
      </div>
    </Link>
  );
}

function TabPanel({ tab }: { tab: TabKey }) {
  const { data: announcements = [], isLoading, isError, refetch } = useAnnouncementsList(tab);
  const EmptyIcon = tab === "scheduled" ? Clock : tab === "draft" ? FileEdit : Megaphone;
  return (
    <div className="mt-4 space-y-2">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          <p>Couldn&apos;t load announcements.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          <EmptyIcon className="size-8 text-muted-foreground/60" />
          <p>Nothing here yet.</p>
        </div>
      ) : (
        announcements.map((a) => <AnnouncementCard key={a.id} a={a} />)
      )}
    </div>
  );
}

export default function AnnouncementsListPage() {
  const [tab, setTab] = useState<TabKey>("published");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground">
            Send updates to students, parents, teachers, or specific classes.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/announcements/new">
            <Plus className="size-4" />
            New announcement
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All announcements</CardTitle>
          <CardDescription>
            Switch tabs to view sent, scheduled, or draft announcements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList>
              {(["published", "scheduled", "draft"] as const).map((t) => (
                <TabsTrigger key={t} value={t}>
                  {TAB_LABEL[t]}
                </TabsTrigger>
              ))}
            </TabsList>
            {(["published", "scheduled", "draft"] as const).map((t) => (
              <TabsContent key={t} value={t}>
                <TabPanel tab={t} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
