"use client";

import { useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  ExternalLink,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNotifications, useMarkNotificationRead } from "@/hooks/useNotifications";
import { NOTIFICATION_TYPE } from "@/types/notification";

const TYPE_ICONS: Record<string, string> = {
  [NOTIFICATION_TYPE.TEACHER_LEAVE_REQUEST]: "📋",
  [NOTIFICATION_TYPE.TEACHER_LEAVE_APPROVED]: "✅",
  [NOTIFICATION_TYPE.TEACHER_LEAVE_REJECTED]: "❌",
  [NOTIFICATION_TYPE.TEACHER_UNAVAILABILITY_ADDED]: "🚫",
};

function getActionLink(
  type: string,
  extra: Record<string, unknown> | null | undefined
): { href: string; label: string } | null {
  if (!extra) return null;

  const teacherId = extra.teacher_id as string | undefined;

  if (
    type === NOTIFICATION_TYPE.TEACHER_LEAVE_REQUEST ||
    type === NOTIFICATION_TYPE.TEACHER_UNAVAILABILITY_ADDED
  ) {
    if (teacherId) {
      return {
        href: `/teachers/${teacherId}?tab=leaves`,
        label: "View Leave Requests",
      };
    }
    return { href: "/teachers", label: "Go to Teachers" };
  }

  if (
    type === NOTIFICATION_TYPE.TEACHER_LEAVE_APPROVED ||
    type === NOTIFICATION_TYPE.TEACHER_LEAVE_REJECTED
  ) {
    return { href: "/teachers", label: "Go to Teachers" };
  }

  return null;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default function NotificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const { data: notifications = [], isLoading, isFetched } = useNotifications(false);
  const markRead = useMarkNotificationRead();
  const markReadAttempted = useRef<string | null>(null);

  const item = useMemo(
    () => notifications.find((n) => n.id === id),
    [notifications, id]
  );

  useEffect(() => {
    markReadAttempted.current = null;
  }, [id]);

  useEffect(() => {
    if (!item || item.read_at) return;
    if (markReadAttempted.current === item.id) return;
    markReadAttempted.current = item.id;
    markRead.mutate(item.id);
  }, [item, markRead]);

  const actionLink = item ? getActionLink(item.type, item.extra_data) : null;
  const icon = item ? (TYPE_ICONS[item.type] ?? "🔔") : "🔔";

  if (isLoading && !item) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isFetched && !item) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <p className="text-muted-foreground">Notification not found.</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="gap-2"
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>

      {/* Notification card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-2xl">
              {icon}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <div className="flex items-start gap-2">
                  <h1 className="text-xl font-semibold leading-snug">{item.title}</h1>
                  {item.read_at && (
                    <span className="mt-1 flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      <CheckCheck className="size-3" />
                      Read
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDateTime(item.created_at)}
                </p>
              </div>

              {item.body ? (
                <p className="text-sm leading-relaxed text-foreground">{item.body}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No additional details.</p>
              )}

              {/* Action button */}
              {actionLink && (
                <div className="pt-2">
                  <Link href={actionLink.href}>
                    <Button className="gap-2">
                      <ExternalLink className="size-4" />
                      {actionLink.label}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification meta */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p>
          <span className="font-medium">Type:</span>{" "}
          <span className="font-mono">{item.type}</span>
        </p>
        <p className="mt-1">
          <span className="font-medium">Channel:</span> {item.channel}
        </p>
      </div>
    </div>
  );
}
