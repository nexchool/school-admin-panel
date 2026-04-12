"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateProfile, uploadProfilePicture, forgotPassword } from "@/services/authService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pencil, Camera, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PROFILE_PIC_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp"];

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return "—";
  }
}

export default function ProfilePage() {
  const { user, refreshUser, roles } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user) setName(user.name ?? "");
  }, [user]);

  const handleEditOpen = (open: boolean) => {
    setEditOpen(open);
    if (open && user) setName(user.name ?? "");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateProfile({ name: name.trim() || undefined });
      await refreshUser();
      setEditOpen(false);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const onPickPhoto = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > PROFILE_PIC_MAX_BYTES) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    const ct = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!ALLOWED_IMAGE.includes(ct)) {
      toast.error("Use a JPEG, PNG, or WebP image.");
      return;
    }
    setUploading(true);
    try {
      await uploadProfilePicture(file);
      await refreshUser();
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setResetSubmitting(true);
    try {
      await forgotPassword({ email: user.email });
      toast.success("If an account exists for this email, a reset link has been sent.");
      setResetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setResetSubmitting(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "?";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Your account in this school workspace. Use{" "}
            <span className="text-foreground">Help &amp; support</span> in the sidebar for contact
            and legal links.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => handleEditOpen(true)}
        >
          <Pencil className="size-4" />
          Edit name
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Identity and access for the admin console. Photo and name apply to this login across the
            app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => void onFileChange(e)}
          />

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user?.profile_picture_url} alt={user?.name || user?.email} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 size-9 rounded-full shadow"
                onClick={() => onPickPhoto()}
                disabled={uploading}
                aria-label="Change profile photo"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </Button>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                JPEG, PNG, or WebP · max 5 MB. Same as staff profile photos elsewhere in the system.
              </p>
              <Button
                type="button"
                variant="link"
                className="h-auto px-0 text-primary"
                onClick={() => onPickPhoto()}
                disabled={uploading}
              >
                Upload new photo
              </Button>
            </div>
          </div>

          {user ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                <dd className="text-base">{user.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                <dd className="text-base break-all">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Email verified</dt>
                <dd className="text-base">{user.email_verified ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Last sign-in</dt>
                <dd className="text-base">{formatDateTime(user.last_login_at)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="mb-2 text-sm font-medium text-muted-foreground">Roles</dt>
                <dd className="flex flex-wrap gap-2">
                  {roles.length === 0 ? (
                    <span className="text-base text-muted-foreground">—</span>
                  ) : (
                    roles.map((r) => (
                      <Badge key={r.id} variant="secondary">
                        {r.name}
                      </Badge>
                    ))
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No user data.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4" />
            Security
          </CardTitle>
          <CardDescription>
            Password changes use a secure email link (same flow as “forgot password”). Your session
            stays active until you sign out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={() => setResetOpen(true)}>
            Email me a password reset link
          </Button>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={handleEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit name</DialogTitle>
            <DialogDescription>
              This is the display name shown in the header and across the admin app.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Email is managed by your school and cannot be changed here.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <form onSubmit={handlePasswordResetRequest}>
            <DialogHeader>
              <DialogTitle>Password reset</DialogTitle>
              <DialogDescription>
                We will send a reset link to <strong>{user?.email}</strong> if this account exists in
                the current school.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetSubmitting}>
                {resetSubmitting ? "Sending…" : "Send link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
