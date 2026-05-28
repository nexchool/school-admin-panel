"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { requiredPermissionsForPath } from "@/lib/navPermissions";

/**
 * Centralized client-side route guard (defense-in-depth — backends already
 * return 403). Redirects users who lack the permissions for the current route
 * to /dashboard so a sub-admin can't navigate to a module they weren't granted.
 *
 * Loop-safe: /dashboard is always-allowed (`requiredPermissionsForPath` returns
 * null), so the redirect target never re-triggers a redirect. We also wait for
 * auth to finish hydrating before deciding.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasAnyPermission, isLoading } = useAuth();

  const required = requiredPermissionsForPath(pathname);
  const isAllowed = required === null || hasAnyPermission(required);

  useEffect(() => {
    // Wait until auth resolves; never redirect mid-hydration.
    if (isLoading) return;
    if (!isAllowed) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAllowed, router]);

  // While auth is hydrating, defer to the parent shell (ProtectedRoute already
  // renders a spinner). Once resolved, hide forbidden content until the
  // redirect completes.
  if (!isLoading && !isAllowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
