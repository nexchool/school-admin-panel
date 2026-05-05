"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks";
import { useSetupStatus } from "@/hooks/useSchoolSetup";

/**
 * Routes reachable while setup is incomplete. The dashboard links into the
 * structural module screens directly, so admins must land there without
 * being bounced back to /school-setup.
 */
const SETUP_ALLOWLIST_PREFIXES = [
  "/school-setup",
  "/profile",
  "/school-units",
  "/programmes",
  "/grades",
  "/academics",
  "/classes",
  "/subjects",
];

function isAllowedDuringSetup(pathname: string): boolean {
  return SETUP_ALLOWLIST_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function SetupGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { hasPermission, isAuthenticated } = useAuth();
  const canManageSetup = hasPermission("school_setup.manage");

  const { data, isLoading, isError, refetch, isFetching } = useSetupStatus();

  const setupComplete = data?.overall.is_setup_complete ?? false;
  const onAllowedRoute = isAllowedDuringSetup(pathname);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!data) return;
    if (setupComplete) return;
    if (onAllowedRoute) return;
    if (!canManageSetup) return;
    router.replace("/school-setup");
  }, [
    isAuthenticated,
    data,
    setupComplete,
    onAllowedRoute,
    canManageSetup,
    router,
  ]);

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

  if (!setupComplete && !onAllowedRoute && !canManageSetup) {
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

  return <>{children}</>;
}
