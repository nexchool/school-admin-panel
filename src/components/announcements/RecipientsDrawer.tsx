"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAnnouncementRecipients } from "@/hooks/useAnnouncements";
import { Check, Clock } from "lucide-react";

interface Props {
  announcementId: string;
  open: boolean;
  onClose: () => void;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function RecipientsDrawer({ announcementId, open, onClose }: Props) {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAnnouncementRecipients(open ? announcementId : undefined);

  const recipients = data?.pages.flatMap((page) => page.items) ?? [];
  // Off the envelope, not off `recipients` — the roster is paged, so measuring
  // the rows in hand would report "20 / 20" for a notice sent to 4,000 parents.
  const total = data?.pages[0]?.total ?? 0;
  const readCount = data?.pages[0]?.read_count ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recipients</DialogTitle>
          <DialogDescription>
            {isLoading
              ? "Loading…"
              : `${readCount} / ${total} read`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : recipients.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No recipients found.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recipients.map((r) => (
                <li
                  key={r.user_id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="truncate font-medium">{r.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs">
                    {r.read_at ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        <span className="text-muted-foreground">
                          {relativeTime(r.read_at)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">unread</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {hasNextPage && (
            <div className="flex justify-center py-3">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-60"
              >
                {isFetchingNextPage
                  ? "Loading…"
                  : `Show more (${recipients.length} of ${total})`}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
