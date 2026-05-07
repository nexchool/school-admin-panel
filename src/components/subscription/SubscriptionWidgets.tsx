"use client";

import { useMemo } from "react";
import { CreditCard, Users, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscriptionState } from "@/hooks/useSubscription";
import type {
  SubscriptionState,
  SubscriptionStatus,
} from "@/services/subscriptionService";

function statusLabel(status: SubscriptionStatus): {
  text: string;
  tone: "ok" | "warn" | "bad";
} {
  switch (status) {
    case "active":
      return { text: "Active", tone: "ok" };
    case "trial":
      return { text: "Trial", tone: "warn" };
    case "suspended":
      return { text: "Suspended", tone: "bad" };
    case "deleted":
      return { text: "Closed", tone: "bad" };
    default:
      return { text: "Unknown", tone: "warn" };
  }
}

function fmtINR(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function MiniCard({
  title,
  icon,
  primary,
  secondary,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  tone?: "ok" | "warn" | "bad";
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
      ? "text-amber-700"
      : tone === "bad"
      ? "text-red-700"
      : "text-foreground";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${toneClass}`}>{primary}</div>
        {secondary ? (
          <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Three-up tile row for the dashboard.
 *
 *  - Subscription status + days remaining when on trial
 *  - Active students count (live billable count)
 *  - Estimated bill from /api/subscription/state
 *
 * Hidden until the data resolves to avoid a "0 / Unknown" flash.
 */
export function SubscriptionWidgets() {
  const { data } = useSubscriptionState();
  if (!data) return null;
  return <SubscriptionWidgetsImpl state={data} />;
}

function SubscriptionWidgetsImpl({ state }: { state: SubscriptionState }) {
  const { subscription, usage, billing } = state;
  const status = statusLabel(subscription.status);

  // Cache "now" for the lifetime of this render-pass tree. The trial
  // countdown is informational; refreshing on each re-render is wasteful
  // and trips the react-hooks/purity rule.
  const now = useMemo(() => Date.now(), []);

  let secondary: React.ReactNode = null;
  if (subscription.status === "trial" && subscription.trial_ends_at) {
    const ms = new Date(subscription.trial_ends_at).getTime() - now;
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    secondary =
      days <= 0
        ? "Trial has ended"
        : `Trial ends in ${days} day${days === 1 ? "" : "s"}`;
  } else if (
    subscription.reason === "SubscriptionSuspended" ||
    subscription.reason === "TenantDeleted"
  ) {
    secondary = subscription.message;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <MiniCard
        title="Subscription"
        icon={<CreditCard className="h-4 w-4" />}
        primary={status.text}
        secondary={secondary ?? `Billing: ${subscription.billing_cycle}`}
        tone={status.tone}
      />
      <MiniCard
        title="Active students"
        icon={<Users className="h-4 w-4" />}
        primary={usage.active_students_count.toLocaleString("en-IN")}
        secondary={
          billing.price_per_student_per_year > 0
            ? `${fmtINR(billing.price_per_student_per_year)} / student / year`
            : "Pricing not set"
        }
      />
      <MiniCard
        title="Estimated bill"
        icon={<Wallet className="h-4 w-4" />}
        primary={fmtINR(billing.total)}
        secondary={
          billing.discount_active
            ? `${billing.discount_percentage}% discount applied`
            : "No active discount"
        }
      />
    </div>
  );
}
