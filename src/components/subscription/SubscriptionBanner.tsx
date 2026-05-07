"use client";

import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";

import { useSubscriptionState } from "@/hooks/useSubscription";

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Layout-level banner.
 *
 *  - "trial" + days left → friendly Clock + countdown.
 *  - "TrialExpired" / "SubscriptionSuspended" → loud red bar with
 *    a contact-support link.
 *  - "active" → render nothing (no nag for paying customers).
 */
export function SubscriptionBanner() {
  const { data } = useSubscriptionState();
  if (!data) return null;

  const sub = data.subscription;
  if (sub.allow_writes && sub.status === "active") return null;

  if (sub.status === "trial" && sub.allow_writes) {
    const left = daysUntil(sub.trial_ends_at);
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {left == null
            ? "You're on a trial."
            : left <= 0
            ? "Your trial ends today."
            : `Trial ends in ${left} day${left === 1 ? "" : "s"}.`}
        </span>
        <Link
          href="/profile"
          className="text-xs font-semibold underline underline-offset-2 hover:text-amber-900"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  if (
    sub.reason === "TrialExpired" ||
    sub.reason === "SubscriptionSuspended" ||
    sub.reason === "TenantDeleted"
  ) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {sub.message ||
            "Your subscription is not active. Write actions are disabled."}
        </span>
        <Link
          href="/profile"
          className="text-xs font-semibold underline underline-offset-2 hover:text-red-900"
        >
          Contact support
        </Link>
      </div>
    );
  }

  return null;
}
