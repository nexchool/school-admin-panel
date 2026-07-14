"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} from "@/services/studentDocumentsService";
import { useUploadStudentDocument } from "@/hooks/useStudentDocuments";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/errorToast";

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onSuccess?: () => void;
}

export function UploadDocumentModal({
  open,
  onOpenChange,
  studentId,
  onSuccess,
}: UploadDocumentModalProps) {
  const [documentType, setDocumentType] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  // Local object URL for an image preview so the user can verify the file
  // before uploading. Null for non-images (e.g. PDFs).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadStudentDocument(studentId);

  // Belt-and-suspenders: revoke any outstanding object URL on unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const setSelectedFile = (next: File | null) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next && next.type.startsWith("image/")
        ? URL.createObjectURL(next)
        : null;
    });
    setFile(next);
  };

  const reset = () => {
    setDocumentType("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleSubmit = async () => {
    if (!documentType || !file) {
      toast.error("Please select document type and choose a file.");
      return;
    }
    try {
      await uploadMutation.mutateAsync({ documentType, file });
      toast.success("Document uploaded");
      onSuccess?.();
      handleClose(false);
    } catch (err) {
      toastError(err, "Upload failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Add a document for this student. Supported formats: PDF, images, etc.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DOCUMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>File</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              // Stack vertically and cap the image to the container width so a
              // wide image can't push content outside the dialog.
              <div className="space-y-2 rounded-lg border border-border p-3">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL of the picked file, not a remote asset
                  <img
                    src={previewUrl}
                    alt={`Preview of ${file.name}`}
                    className="mx-auto max-h-56 w-auto max-w-full rounded-md object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="size-5 shrink-0" />
                    <span className="text-xs">
                      No inline preview for this file type.
                    </span>
                  </div>
                )}
                <p className="truncate text-center text-xs text-muted-foreground">
                  {file.name}
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!documentType || !file || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
