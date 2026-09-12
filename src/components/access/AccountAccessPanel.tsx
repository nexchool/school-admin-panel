"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DetailTable, SectionCard } from "@/components/detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAccountAccess,
  useAccountSessions,
  useReactivateAccount,
  useRevokeAccountSession,
  useRevokeAllAccountSessions,
  useSuspendAccount,
} from "@/hooks/useAccountAccess";
import type { AccountSession } from "@/services/accountAccessService";
import { formatDateTime } from "@/lib/datetime";

/**
 * Whether this person can get in, and where they currently are.
 *
 * Deliberately separate from the credential panel above it. That one is about
 * the secrets a school issues; this one is about the access those secrets
 * buy, and the two are different decisions with different consequences.
 * Resetting a password gives somebody a new way in. Suspending takes every
 * way in away at once, including the token already open on their phone.
 *
 * **Nothing here can show a secret.** A session is described by where and
 * when — an app, an address, a time — never by the token that proves it.
 * There is no endpoint that would return one and no field on these types that
 * could hold one.
 *
 * Rendered only where the viewer may manage users, and every action behind it
 * is checked again on the server, which is where the check that counts lives.
 */

const METHOD_NAMES: Record<string, string> = {
  email_password: "Email and password",
  mobile_otp: "Mobile number and a code",
  mobile_pin: "Mobile number and PIN",
  admission_id_password: "Admission number and password",
};

function describeDevice(session: AccountSession): string {
  const surface =
    session.client_surface === "admin-web"
      ? "School dashboard"
      : session.client_surface === "student-mobile"
        ? "Mobile app"
        : session.client_surface === "panel"
          ? "Operator panel"
          : "Unknown app";
  return session.ip_address ? `${surface} · ${session.ip_address}` : surface;
}

export function AccountAccessPanel({
  accountId,
  personName,
}: {
  accountId: string | null | undefined;
  personName?: string;
}) {
  const { data: access, isLoading } = useAccountAccess(accountId);
  const { data: sessionData } = useAccountSessions(accountId, {
    enabled: Boolean(access?.has_account),
  });

  const suspend = useSuspendAccount();
  const reactivate = useReactivateAccount();
  const revokeOne = useRevokeAccountSession();
  const revokeAll = useRevokeAllAccountSessions();

  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [confirmingRevokeAll, setConfirmingRevokeAll] = useState(false);
  const [reason, setReason] = useState("");

  if (!accountId) return null;

  if (isLoading) {
    return (
      <SectionCard
        title="Access"
        description="Whether this person can sign in"
        icon={ShieldAlert}
      >
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      </SectionCard>
    );
  }

  if (!access?.has_account) return null;

  const sessions = sessionData?.sessions ?? [];
  const suspended = Boolean(access.is_suspended);
  const who = personName ?? "This person";

  return (
    <SectionCard
      title="Access"
      description="Whether this person can sign in, and where they are signed in"
      icon={ShieldAlert}
      actions={
        suspended ? (
          <Button
            type="button"
            size="sm"
            disabled={reactivate.isPending}
            onClick={() => reactivate.mutate({ accountId })}
          >
            Restore access
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={suspend.isPending}
            onClick={() => setConfirmingSuspend(true)}
          >
            Suspend access
          </Button>
        )
      }
    >
      <DetailTable
        rows={[
          [
            "Status",
            suspended ? (
              <Badge key="s" variant="destructive">
                Suspended
              </Badge>
            ) : access.is_locked ? (
              // Different from a suspension, and said so: this one clears
              // itself after a while, and nobody chose it.
              <Badge key="s" variant="secondary">
                Temporarily locked after failed sign-ins
              </Badge>
            ) : (
              <Badge key="s">Active</Badge>
            ),
          ],
          [
            "Can sign in with",
            access.allowed_methods?.length
              ? access.allowed_methods
                  .map((method) => METHOD_NAMES[method] ?? method)
                  .join(", ")
              : "Nothing — no method is enabled for them",
          ],
          [
            "Must change password next time",
            access.must_change_password ? "Yes" : "No",
          ],
          [
            "Signed in on",
            sessions.length === 0
              ? "Nowhere"
              : `${sessions.length} ${sessions.length === 1 ? "device" : "devices"}`,
          ],
          [
            "Last signed in",
            access.last_login_at
              ? formatDateTime(access.last_login_at)
              : "Never",
          ],
        ]}
      />

      {sessions.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Signed-in devices</h4>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={revokeAll.isPending}
              onClick={() => setConfirmingRevokeAll(true)}
            >
              Sign out everywhere
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{describeDevice(session)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {METHOD_NAMES[session.login_method ?? ""] ??
                      session.login_method ??
                      "Unknown method"}
                    {session.last_accessed_at
                      ? ` · last used ${formatDateTime(session.last_accessed_at)}`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={revokeOne.isPending}
                  onClick={() =>
                    revokeOne.mutate({ accountId, sessionId: session.id })
                  }
                >
                  Sign out
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={confirmingSuspend}
        onOpenChange={(open) => {
          setConfirmingSuspend(open);
          if (!open) setReason("");
        }}
        title="Suspend this person's access?"
        description={
          `${who} will be signed out of every device immediately and will not ` +
          "be able to sign in again until you restore access. Their record, " +
          "their password and their PIN are not affected."
        }
        confirmLabel="Suspend access"
        variant="destructive"
        loading={suspend.isPending}
        onConfirm={() =>
          suspend.mutate({ accountId, reason: reason.trim() || undefined })
        }
      >
        {/* Recorded against the suspension so that whoever asks later — the
            person themselves, an auditor, the next administrator — finds an
            answer rather than an unexplained closed door. */}
        <label className="block text-sm">
          <span className="text-muted-foreground">Why? (optional)</span>
          <Input
            className="mt-1"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Pending an enquiry"
            maxLength={200}
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmingRevokeAll}
        onOpenChange={setConfirmingRevokeAll}
        title="Sign this person out everywhere?"
        description={
          `${who} will be signed out of every device. They can sign in again ` +
          "straight away — this does not suspend their access."
        }
        confirmLabel="Sign out everywhere"
        variant="destructive"
        loading={revokeAll.isPending}
        onConfirm={() => revokeAll.mutate({ accountId })}
      />
    </SectionCard>
  );
}
