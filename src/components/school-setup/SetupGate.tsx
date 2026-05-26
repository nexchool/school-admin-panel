"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks";
import { useSetupStatus } from "@/hooks/useSchoolSetup";

export function SetupGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { hasPermission, isAuthenticated } = useAuth();
  const canManageSetup = hasPermission("school_setup.manage");

  const { data, isLoading, isError, refetch, isFetching } = useSetupStatus();

  const setupComplete = data?.overall.is_setup_complete ?? false;
  const onSetupRoute = pathname === "/school-setup" || pathname.startsWith("/school-setup/");

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto mt-12 max-w-lg rounded-lg border bg-muted/40 p-6 text-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div className="flex-1 space-y-2">
            <h2 className="text-base font-semibold">Setup status unavailable</h2>
            <p className="text-muted-foreground">
              We couldn&rsquo;t load setup status. This usually clears on retry.
              If it persists, contact your administrator.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Retrying…" : "Retry"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Non-admins see an informational card; they cannot manage setup.
  if (!setupComplete && !canManageSetup) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border bg-muted/40 p-6 text-sm">
        <h2 className="text-base font-semibold">School setup is in progress</h2>
        <p className="mt-2 text-muted-foreground">
          The school administrator hasn&rsquo;t finished setting things up yet.
          Please come back shortly. If this looks wrong, contact your admin.
        </p>
      </div>
    );
  }

  const showBanner =
    isAuthenticated &&
    !setupComplete &&
    canManageSetup &&
    !onSetupRoute;

  return (
    <>
      {showBanner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              School setup is incomplete. Some features may be unavailable until
              you finish setup.
            </span>
          </div>
          <Link
            href="/school-setup"
            className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
          >
            Continue setup →
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
