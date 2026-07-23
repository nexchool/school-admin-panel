"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Download,
} from "lucide-react";
import {
  useStudentDocuments,
  useDeleteStudentDocument,
} from "@/hooks/useStudentDocuments";
import {
  studentDocumentsService,
  DOCUMENT_TYPE_LABELS,
  type StudentDocument,
} from "@/services/studentDocumentsService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { UploadDocumentModal } from "./UploadDocumentModal";
import { DocumentThumbnail } from "./DocumentThumbnail";
import { toastError } from "@/lib/errorToast";

interface StudentDocumentsSectionProps {
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
}

/**
 * Filename for a downloaded document: `<type>_<student name>_<admission>.<ext>`
 * (e.g. `Leaving_Certificate_John_Doe_ADM2026001.jpg`). Non-word characters in
 * each part collapse to underscores so the result is filesystem-safe; the
 * extension is preserved from the stored filename.
 */
function buildDownloadName(
  doc: StudentDocument,
  studentName?: string,
  admissionNumber?: string
): string {
  const typeLabel =
    doc.document_type_label ||
    DOCUMENT_TYPE_LABELS[doc.document_type] ||
    doc.document_type ||
    "document";
  const ext = doc.original_filename?.includes(".")
    ? doc.original_filename.split(".").pop()
    : "";
  const clean = (s?: string) =>
    (s ?? "").trim().replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
  const base =
    [typeLabel, studentName, admissionNumber].map(clean).filter(Boolean).join("_") ||
    "document";
  return ext ? `${base}.${ext}` : base;
}

function formatBytes(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function StudentDocumentsSection({
  studentId,
  studentName,
  admissionNumber,
}: StudentDocumentsSectionProps) {
  const { data: documents = [], isLoading, refetch } = useStudentDocuments(studentId);
  const deleteMutation = useDeleteStudentDocument(studentId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<StudentDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | undefined>(undefined);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<StudentDocument | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // Guards the async preview fetch: only the latest requested document may
  // commit its blob to state (rapid preview clicks can resolve out of order).
  const viewerRequestRef = useRef<string | null>(null);

  const revokePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => () => revokePreview(), [revokePreview]);

  const performDeleteDoc = async () => {
    const doc = deleteDoc;
    if (!doc) return;
    // Toasts owned by useDeleteStudentDocument; rejection propagates to the
    // confirm dialog.
    await deleteMutation.mutateAsync(doc.id);
  };

  const handleOpen = async (doc: StudentDocument) => {
    viewerRequestRef.current = doc.id;
    setViewerDoc(doc);
    setViewerOpen(true);
    setViewerLoading(true);
    setViewerError(null);
    revokePreview();
    setPreviewMime(undefined);
    try {
      const blob = await studentDocumentsService.downloadDocumentBlob(
        studentId,
        doc.id
      );
      const url = URL.createObjectURL(blob);
      if (viewerRequestRef.current !== doc.id) {
        // Superseded by a newer preview (or the dialog closed) — discard.
        URL.revokeObjectURL(url);
        return;
      }
      const mime = blob.type || doc.mime_type || "";
      setPreviewMime(mime);
      setPreviewUrl(url);
    } catch (e: unknown) {
      if (viewerRequestRef.current !== doc.id) return;
      const msg = e instanceof Error ? e.message : "Could not open document";
      setViewerError(msg);
    } finally {
      if (viewerRequestRef.current === doc.id) setViewerLoading(false);
    }
  };

  const handleDownload = async (doc: StudentDocument) => {
    setDownloadingId(doc.id);
    try {
      const blob = await studentDocumentsService.downloadDocumentBlob(
        studentId,
        doc.id
      );
      const url = URL.createObjectURL(blob);
      triggerDownload(url, buildDownloadName(doc, studentName, admissionNumber));
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toastError(e, "Could not download document");
    } finally {
      setDownloadingId(null);
    }
  };

  // In the viewer the blob is already fetched — reuse it instead of refetching.
  const handleViewerDownload = () => {
    if (!viewerDoc) return;
    if (previewUrl) {
      triggerDownload(
        previewUrl,
        buildDownloadName(viewerDoc, studentName, admissionNumber)
      );
    } else {
      void handleDownload(viewerDoc);
    }
  };

  const closeViewer = () => {
    viewerRequestRef.current = null;
    setViewerOpen(false);
    revokePreview();
    setViewerDoc(null);
    setViewerError(null);
    setPreviewMime(undefined);
  };

  const list = Array.isArray(documents) ? documents : [];

  return (
    // The documents list is a narrow single column — cap the width so the tab
    // doesn't stretch edge-to-edge on wide screens.
    <Card className="w-full max-w-3xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Documents</CardTitle>
        <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1">
          <Plus className="size-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="size-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No documents uploaded yet.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setUploadOpen(true)}
            >
              Add Document
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <DocumentThumbnail
                    studentId={studentId}
                    doc={doc}
                    onClick={() => handleOpen(doc)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {doc.document_type_label ||
                        DOCUMENT_TYPE_LABELS[doc.document_type] ||
                        doc.document_type}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        doc.original_filename,
                        formatBytes(doc.file_size_bytes),
                        doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString()
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Preview"
                    aria-label={`Preview ${doc.original_filename}`}
                    onClick={() => handleOpen(doc)}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Download"
                    aria-label={`Download ${doc.original_filename}`}
                    disabled={downloadingId === doc.id}
                    onClick={() => handleDownload(doc)}
                  >
                    {downloadingId === doc.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    title="Delete"
                    aria-label={`Delete ${doc.original_filename}`}
                    onClick={() => setDeleteDoc(doc)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <UploadDocumentModal
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          studentId={studentId}
          onSuccess={() => {
            setUploadOpen(false);
            refetch();
          }}
        />

        <ConfirmDialog
          open={!!deleteDoc}
          onOpenChange={(o) => !o && setDeleteDoc(null)}
          title={deleteDoc ? `Delete “${deleteDoc.original_filename}”?` : "Delete document?"}
          confirmLabel="Delete"
          variant="destructive"
          loading={deleteMutation.isPending}
          onConfirm={performDeleteDoc}
        />

        <Dialog
          open={viewerOpen}
          onOpenChange={(open) => {
            if (!open) closeViewer();
          }}
        >
          <DialogContent
            className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
            onClose={closeViewer}
          >
            <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
              <div className="flex items-center gap-2 pr-8">
                <DialogTitle className="min-w-0 flex-1 truncate">
                  {viewerDoc?.original_filename ?? "Document"}
                </DialogTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleViewerDownload}
                  disabled={viewerLoading || !!viewerError}
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
              </div>
            </DialogHeader>
            <div className="min-h-[50vh] flex-1 overflow-auto bg-muted/30 p-4 select-none">
              {viewerLoading && (
                <div className="flex h-[50vh] items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {!viewerLoading && viewerError && (
                <p className="text-center text-sm text-destructive">{viewerError}</p>
              )}
              {!viewerLoading && !viewerError && previewUrl && viewerDoc && (
                <>
                  {(previewMime || viewerDoc.mime_type || "").startsWith(
                    "image/"
                  ) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={viewerDoc.original_filename}
                      className="mx-auto max-h-[70vh] max-w-full object-contain"
                    />
                  ) : (previewMime || viewerDoc.mime_type || "").includes(
                      "pdf"
                    ) ? (
                    <iframe
                      title={viewerDoc.original_filename}
                      src={previewUrl}
                      className="h-[70vh] w-full rounded border-0 bg-background"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <p className="text-sm text-muted-foreground">
                        Preview not available for this file type.
                      </p>
                      <a
                        href={previewUrl}
                        download={buildDownloadName(
                          viewerDoc,
                          studentName,
                          admissionNumber
                        )}
                        className="text-sm font-medium text-primary underline"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
