"use client";

import Link from "next/link";
import { CalendarClock, Moon, Phone, Sun, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { HostelGatepass } from "@/services/hostelService";

type GatepassCardProps = {
  gp: HostelGatepass;
  /** Bag of action buttons rendered in the card footer. */
  actions?: React.ReactNode;
  /** Tone override; defaults derived from status. */
  className?: string;
};

/**
 * Compact card for the kanban board. Day_out vs night_out gets a sun /
 * moon icon. The right side renders any actions the parent column wants
 * (Approve, Reject, Checkout, Checkin, …). The body is a link to the
 * gatepass detail page so warden can drill in for the audit trail.
 */
export function GatepassCard({ gp, actions, className }: GatepassCardProps) {
  const TypeIcon = gp.type === "night_out" ? Moon : Sun;
  const isOverdue = gp.status === "overdue";

  return (
    <Card
      className={cn(
        "flex flex-col",
        isOverdue && "border-rose-300 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20",
        gp.type === "night_out" && !isOverdue && "border-indigo-200 dark:border-indigo-900/40",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <TypeIcon className="size-3.5" />
            {gp.type === "night_out" ? "Night out" : "Day out"}
          </div>
          <StatusBadge status={gp.status} />
        </div>
        <Link
          href={`/hostel/gatepasses/${gp.id}`}
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          <User className="size-3.5 text-muted-foreground" />
          {gp.student_name || `${gp.student_id.slice(0, 8)}…`}
          {gp.admission_number ? (
            <span className="text-xs text-muted-foreground">
              · {gp.admission_number}
            </span>
          ) : null}
        </Link>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" />
          <span className="tabular-nums">
            {new Date(gp.departure_datetime).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="ml-[1.25rem] tabular-nums">
            → {new Date(gp.expected_return_datetime).toLocaleString()}
          </span>
        </div>
        {gp.reason && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {gp.reason}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="size-3.5" />
          <a
            href={`tel:${gp.parent_phone.replace(/\s+/g, "")}`}
            className="hover:underline"
          >
            {gp.parent_phone}
          </a>
        </div>

        {actions && <div className="mt-auto flex flex-wrap gap-2 pt-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: HostelGatepass["status"] }) {
  const variant: "default" | "secondary" | "destructive" | "outline" = (() => {
    switch (status) {
      case "approved":
        return "outline";
      case "active":
        return "default";
      case "overdue":
      case "rejected":
        return "destructive";
      case "closed":
        return "secondary";
      default:
        return "secondary";
    }
  })();
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

export function GatepassQuickActions({
  gp,
  onApprove,
  onReject,
  onCheckout,
  onCheckin,
  busy,
}: {
  gp: HostelGatepass;
  onApprove?: () => void;
  onReject?: () => void;
  onCheckout?: () => void;
  onCheckin?: () => void;
  busy?: boolean;
}) {
  if (gp.status === "pending") {
    return (
      <>
        {onApprove && (
          <Button size="sm" onClick={onApprove} disabled={busy}>
            Approve
          </Button>
        )}
        {onReject && (
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={busy}
          >
            Reject
          </Button>
        )}
      </>
    );
  }
  if (gp.status === "approved" && onCheckout) {
    return (
      <Button size="sm" onClick={onCheckout} disabled={busy}>
        Mark checkout
      </Button>
    );
  }
  if ((gp.status === "active" || gp.status === "overdue") && onCheckin) {
    return (
      <Button size="sm" onClick={onCheckin} disabled={busy}>
        Mark check-in
      </Button>
    );
  }
  return null;
}
