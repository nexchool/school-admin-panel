"use client";

import { usePathname } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks";
import { useSetupStatus } from "@/hooks/useSchoolSetup";
import { setupBannerFor } from "./setupBanner";

export function SetupGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const { isAuthenticated, isPlatformAdmin, isSubAdmin, isSetupComplete } =
    useAuth();

  // Only the platform super-admin may call the now-permission-gated status
  // endpoint (`school_setup.read|manage`). Everyone else (school admin,
  // sub-admin) would 403, so the query is disabled for them and they rely on the
  // `isSetupComplete` flag from the auth context instead.
  const {
    data,
    isLoading: isStatusLoading,
    isError,
    refetch,
    isFetching,
  } = useSetupStatus({ enabled: isPlatformAdmin });

  const onSetupRoute =
    pathname === "/school-setup" || pathname.startsWith("/school-setup/");

  const banner = setupBannerFor({
    isPlatformAdmin,
    isSubAdmin,
    isSetupComplete,
  });

  // --- Platform super-admin: detailed, status-driven actionable flow ---
  if (banner === "actionable") {
    if (isStatusLoading) {
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
              <h2 className="text-base font-semibold">
                Setup status unavailable
              </h2>
              <p className="text-muted-foreground">
                We couldn&rsquo;t load setup status. This usually clears on
                retry. If it persists, contact your administrator.
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

    const setupComplete = data.overall.is_setup_complete ?? false;
    const showBanner = isAuthenticated && !setupComplete && !onSetupRoute;

    return (
      <>
        {showBanner && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                School setup is incomplete. Some features may be unavailable
                until setup is completed by your administrator.
              </span>
            </div>
          </div>
        )}
        {children}
      </>
    );
  }

  // --- Non-super-admin with incomplete setup: blocked, persona-specific copy ---
  // Keep feature content blocked (don't loosen the gate), but never on the
  // setup routes themselves.
  if ((banner === "admin-contact" || banner === "subadmin-contact") && !onSetupRoute) {
    const message =
      banner === "subadmin-contact"
        ? "Contact your administrator to help with this issue, or contact our support team directly."
        : "Contact support to finish the setup first and then access the other features.";

    return (
      <div className="mx-auto max-w-lg rounded-lg border bg-muted/40 p-6 text-sm">
        <h2 className="text-base font-semibold">School setup is incomplete</h2>
        <p className="mt-2 text-muted-foreground">{message}</p>
      </div>
    );
  }

  // banner === "none" (setup complete, or super-admin handled above), or a
  // non-super-admin sitting on a /school-setup route: render content as-is.
  return <>{children}</>;
}
