"use client";

import { ShieldAlert } from "lucide-react";

import { useAuth } from "@/hooks";

/**
 * Persistent, unmissable indicator shown only to a platform super-admin who is
 * operating inside a tenant's live data ("god mode"). Mounted in the dashboard
 * chrome so it appears on every dashboard page.
 */
export function GodModeBanner() {
  const { isPlatformAdmin, tenantName } = useAuth();

  if (!isPlatformAdmin) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900"
    >
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span>
        Platform admin — you are operating in{" "}
        <span className="font-semibold">{tenantName ?? "this school"}</span> (god
        mode). Changes affect this school&rsquo;s live data.
      </span>
    </div>
  );
}
