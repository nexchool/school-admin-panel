"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Phone, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  GatepassQuickActions,
  StatusBadge,
} from "@/components/hostel/GatepassCard";
import {
  useApproveGatepass,
  useGatepass,
  useGatepassCheckin,
  useGatepassCheckout,
  useRejectGatepass,
} from "@/hooks/useHostel";

import type { HostelGatepassAudit } from "@/services/hostelService";

/**
 * Gatepass detail + full audit trail.
 *
 * Routed after gatepass creation; also linked from cards on the kanban.
 */
export default function GatepassDetailPage() {
  const params = useParams<{ gatepassId: string }>();
  const gatepassId = params.gatepassId;

  const query = useGatepass(gatepassId);
  const approve = useApproveGatepass();
  const reject = useRejectGatepass();
  const checkout = useGatepassCheckout();
  const checkin = useGatepassCheckin();

  const busy =
    approve.isPending ||
    reject.isPending ||
    checkout.isPending ||
    checkin.isPending;

  if (query.isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Card className="m-6">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-destructive">Gatepass not found.</p>
          <Button
            variant="outline"
            onClick={() => query.refetch()}
            className="gap-2"
          >
            <RotateCcw className="size-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { gatepass, audit_trail } = query.data;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/hostel/gatepasses"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> All gatepasses
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {gatepass.type === "night_out" ? "Night out" : "Day out"} gatepass
          </h1>
          <p className="text-sm text-muted-foreground">
            Requested {new Date(gatepass.requested_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={gatepass.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details (2/3) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Student">
              <Link
                href={`/hostel/students/${gatepass.student_id}`}
                className="text-primary hover:underline"
              >
                {gatepass.student_name || `${gatepass.student_id.slice(0, 8)}…`}
              </Link>
              {gatepass.admission_number ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  {gatepass.admission_number}
                </span>
              ) : null}
            </Row>
            <Row label="Departure">
              {new Date(gatepass.departure_datetime).toLocaleString()}
            </Row>
            <Row label="Expected return">
              {new Date(gatepass.expected_return_datetime).toLocaleString()}
            </Row>
            <Row label="Reason">{gatepass.reason ?? "—"}</Row>
            <Row label="Parent phone">
              <a
                href={`tel:${gatepass.parent_phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <Phone className="size-3.5" /> {gatepass.parent_phone}
              </a>
            </Row>
            <Row label="Actual checkout">
              {gatepass.actual_out_at
                ? new Date(gatepass.actual_out_at).toLocaleString()
                : "—"}
            </Row>
            <Row label="Actual check-in">
              {gatepass.actual_in_at
                ? new Date(gatepass.actual_in_at).toLocaleString()
                : "—"}
            </Row>
            {gatepass.notes && (
              <Row label="Notes">
                <span className="whitespace-pre-wrap">{gatepass.notes}</span>
              </Row>
            )}

            <div className="flex flex-wrap gap-2 border-t pt-4">
              <GatepassQuickActions
                gp={gatepass}
                busy={busy}
                onApprove={() => approve.mutate(gatepass.id)}
                onReject={() => {
                  // null = Cancel → abort; "" = OK with empty → proceed.
                  const input = window.prompt("Reason for rejection (optional):");
                  if (input === null) return;
                  reject.mutate({ id: gatepass.id, reason: input.trim() || undefined });
                }}
                onCheckout={() => checkout.mutate(gatepass.id)}
                onCheckin={() => checkin.mutate(gatepass.id)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Audit trail (1/3) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Audit trail</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {audit_trail.map((entry) => (
                <AuditEntry key={entry.id} entry={entry} />
              ))}
              {audit_trail.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No audit history yet.
                </p>
              )}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="min-w-[8rem] text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

function AuditEntry({ entry }: { entry: HostelGatepassAudit }) {
  return (
    <li className="relative border-l-2 border-muted pl-4">
      <span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-foreground" />
      <p className="flex items-center gap-2 font-medium">
        <span className="capitalize">{entry.action.replace(/_/g, " ")}</span>
        <Badge variant="outline" className="text-xs capitalize">
          {entry.actor_type}
        </Badge>
      </p>
      <p className="text-xs text-muted-foreground">
        {new Date(entry.created_at).toLocaleString()}
      </p>
      {entry.notes && (
        <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
      )}
    </li>
  );
}
