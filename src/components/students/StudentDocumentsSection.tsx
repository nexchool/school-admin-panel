"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import {
  useStudentDocuments,
  useUploadStudentDocument,
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
import { UploadDocumentModal } from "./UploadDocumentModal";

interface StudentDocumentsSectionProps {
  studentId: string;
}

export function StudentDocumentsSection({ studentId }: StudentDocumentsSectionProps) {
  const { data: documents = [], isLoading, refetch } = useStudentDocuments(studentId);
  const uploadMutation = useUploadStudentDocument(studentId);
  const deleteMutation = useDeleteStudentDocument(studentId);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<StudentDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | undefined>(undefined);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  const revokePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => () => revokePreview(), [revokePreview]);

  const handleDelete = (doc: StudentDocument) => {
    if (confirm(`Delete "${doc.original_filename}"?`)) {
      deleteMutation.mutate(doc.id);
    }
  };

  const handleOpen = async (doc: StudentDocument) => {
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
      const mime = blob.type || doc.mime_type || "";
      setPreviewMime(mime);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not open document";
      setViewerError(msg);
    } finally {
      setViewerLoading(false);
    }
  };

  const closeViewer = () => {
    setViewerOpen(false);
    revokePreview();
    setViewerDoc(null);
    setViewerError(null);
    setPreviewMime(undefined);
  };

  const list = Array.isArray(documents) ? documents : [];

  return (
    <Card>
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
                  <FileText className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {doc.document_type_label ||
                        DOCUMENT_TYPE_LABELS[doc.document_type] ||
                        doc.document_type}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.original_filename}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => handleOpen(doc)}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(doc)}
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
              <DialogTitle className="truncate pr-8">
                {viewerDoc?.original_filename ?? "Document"}
              </DialogTitle>
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
                        download={viewerDoc.original_filename}
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
