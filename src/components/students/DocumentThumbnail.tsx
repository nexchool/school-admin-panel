"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import {
  studentDocumentsService,
  type StudentDocument,
} from "@/services/studentDocumentsService";
import { cn } from "@/lib/utils";

function isImageDoc(doc: StudentDocument): boolean {
  return (doc.mime_type ?? "").startsWith("image/");
}

interface DocumentThumbnailProps {
  studentId: string;
  doc: StudentDocument;
  /** When provided, the tile becomes a button (e.g. to open the full viewer). */
  onClick?: () => void;
  className?: string;
}

/**
 * A small square preview for a student document. For image documents it fetches
 * the (authenticated) file blob once and renders a thumbnail so the user can
 * eyeball the file without opening it; PDFs / non-images and any load failure
 * fall back to a generic file icon. Each instance owns its object URL and
 * revokes it on unmount — no shared state, so rapid list changes can't leak or
 * cross a URL between rows.
 */
export function DocumentThumbnail({
  studentId,
  doc,
  onClick,
  className,
}: DocumentThumbnailProps) {
  const image = isImageDoc(doc);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!image) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    studentDocumentsService
      .downloadDocumentBlob(studentId, doc.id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [studentId, doc.id, image]);

  const tile =
    "size-11 shrink-0 overflow-hidden rounded-md border border-border";

  let inner: React.ReactNode;
  if (image && !failed) {
    inner = url ? (
      // eslint-disable-next-line @next/next/no-img-element -- object URL of a fetched blob, not a remote asset
      <img
        src={url}
        alt={doc.original_filename}
        className="size-full object-cover"
      />
    ) : (
      <div className="flex size-full items-center justify-center bg-muted">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  } else {
    inner = (
      <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
        <FileText className="size-5" />
      </div>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Open preview of ${doc.original_filename}`}
        className={cn(
          tile,
          "cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
      >
        {inner}
      </button>
    );
  }

  return <div className={cn(tile, className)}>{inner}</div>;
}
