"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useMySessions,
  useRevokeMyOtherSessions,
  useRevokeMySession,
} from "@/hooks/useAccountAccess";
import type { AccountSession } from "@/services/accountAccessService";
import { formatDateTime } from "@/lib/datetime";

/**
 * Where the signed-in person is signed in, and how to end any of it.
 *
 * Here rather than only in the administrator's view because the person who
 * first suspects their password is known is usually its owner, and making
 * them wait for an administrator to act is the difference between a scare and
 * a breach. It needs no permission: the token says whose sessions these are.
 *
 * **No token appears on this screen.** A session is an app, an address and a
 * time; what proves it is never sent to the browser and there is no endpoint
 * that would return it.
 */

const SURFACE_NAMES: Record<string, string> = {
  "admin-web": "School dashboard",
  "student-mobile": "Mobile app",
  panel: "Operator panel",
};

const METHOD_NAMES: Record<string, string> = {
  email_password: "Email and password",
  mobile_otp: "Mobile number and a code",
  mobile_pin: "Mobile number and PIN",
  admission_id_password: "Admission number and password",
};

function describe(session: AccountSession): string {
  const surface = SURFACE_NAMES[session.client_surface ?? ""] ?? "Unknown app";
  return session.ip_address ? `${surface} · ${session.ip_address}` : surface;
}

export function MySessionsCard() {
  const { data, isLoading } = useMySessions();
  const revokeOne = useRevokeMySession();
  const revokeOthers = useRevokeMyOtherSessions();
  const [confirming, setConfirming] = useState(false);

  const sessions = data?.sessions ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Where you&rsquo;re signed in</CardTitle>
          <CardDescription>
            If you see somewhere you don&rsquo;t recognise, sign it out and
            change your password.
          </CardDescription>
        </div>
        {sessions.length > 1 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={revokeOthers.isPending}
            onClick={() => setConfirming(true)}
          >
            Sign out everywhere else
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing to show — this is your only session.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{describe(session)}</p>
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
                  onClick={() => revokeOne.mutate({ sessionId: session.id })}
                >
                  Sign out
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Sign out everywhere else?"
        description="You will stay signed in here. Every other device will need to sign in again."
        confirmLabel="Sign out everywhere else"
        loading={revokeOthers.isPending}
        onConfirm={() => revokeOthers.mutate(undefined)}
      />
    </Card>
  );
}
