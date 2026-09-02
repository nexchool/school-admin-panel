"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ChevronLeft,
  Clock,
  PhoneCall,
  Search,
  Sun,
  Moon,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useStudentSearch } from "@/hooks/useStudents";
import {
  useGatepassCheckin,
  useGatepassCheckout,
  useGatepasses,
} from "@/hooks/useHostel";
import { StatusBadge } from "@/components/hostel/GatepassCard";

import type { HostelGatepass } from "@/services/hostelService";
import type { Student } from "@/types/student";

/**
 * Screen 8 — Gatekeeper operations.
 *
 * Mobile-first single-task flow used at the gate:
 *   1. Look up the student by name / admission # / phone (large input).
 *   2. Page shows their profile + the gatepass(es) currently waiting on
 *      a gate action: approved (needs checkout) or active/overdue (needs
 *      checkin).
 *   3. One-tap action buttons mark actual_out_at / actual_in_at via the
 *      backend; the page updates immediately and shows a confirmation
 *      toast-like banner.
 *
 * The layout is single-column with extra-large tap targets; on tablet /
 * desktop the same layout still works but is centered with a max-width
 * for readability.
 */
export default function GatekeeperPage() {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "err"; msg: string } | null>(
    null
  );

  // Pull the student list when the gatekeeper has typed something. Keep
  // results tight (10) so the page doesn't drown them.
  const studentsQuery = useStudentSearch({
    search: search.trim() || undefined,
    per_page: 10,
  });

  // Once a student is picked, pull their gatepasses with status filters
  // that matter for the gate.
  const gateEnabled = !!selectedStudent?.id;
  const approvedGpQuery = useGatepasses(
    { student_id: selectedStudent?.id, status: "approved" },
    { enabled: gateEnabled },
  );
  const activeGpQuery = useGatepasses(
    { student_id: selectedStudent?.id, status: "active" },
    { enabled: gateEnabled },
  );
  const overdueGpQuery = useGatepasses(
    { student_id: selectedStudent?.id, status: "overdue" },
    { enabled: gateEnabled },
  );

  const checkout = useGatepassCheckout();
  const checkin = useGatepassCheckin();

  const actionableGatepasses = useMemo(() => {
    return [
      ...(approvedGpQuery.data?.gatepasses ?? []),
      ...(activeGpQuery.data?.gatepasses ?? []),
      ...(overdueGpQuery.data?.gatepasses ?? []),
    ];
  }, [approvedGpQuery.data, activeGpQuery.data, overdueGpQuery.data]);

  function showOk(msg: string) {
    setFlash({ kind: "ok", msg });
    setTimeout(() => setFlash(null), 4000);
  }
  function showErr(msg: string) {
    setFlash({ kind: "err", msg });
    setTimeout(() => setFlash(null), 5000);
  }

  async function handleCheckout(gp: HostelGatepass) {
    try {
      await checkout.mutateAsync(gp.id);
      showOk(`Departure recorded for ${selectedStudent?.name ?? "student"}.`);
    } catch (err) {
      showErr(err instanceof Error ? err.message : "Checkout failed.");
    }
  }

  async function handleCheckin(gp: HostelGatepass) {
    try {
      await checkin.mutateAsync(gp.id);
      showOk(`Return recorded for ${selectedStudent?.name ?? "student"}.`);
    } catch (err) {
      showErr(err instanceof Error ? err.message : "Check-in failed.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-1">
        <Link
          href="/hostel"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Hostels
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Gate operations</h1>
        <p className="text-sm text-muted-foreground">
          Scan or search a student to record their departure or return.
        </p>
      </div>

      {/* Banner */}
      {flash && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border p-3 text-sm",
            flash.kind === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100"
              : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100"
          )}
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>{flash.msg}</span>
        </div>
      )}

      {/* Lookup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find student</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (selectedStudent) setSelectedStudent(null);
              }}
              placeholder="Scan ID, name, or admission number…"
              className="h-12 pl-10 text-base"
              autoFocus
              inputMode="search"
            />
          </div>

          {search.trim() && !selectedStudent && (
            <div className="rounded-md border bg-card">
              {studentsQuery.isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (studentsQuery.data?.items.length ?? 0) === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No students match.
                </p>
              ) : (
                <ul role="listbox">
                  {studentsQuery.data!.items.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          setSearch("");
                        }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted"
                      >
                        <Avatar className="size-10">
                          {s.profile_picture ? (
                            <AvatarImage src={s.profile_picture} alt={s.name} />
                          ) : (
                            <AvatarFallback>
                              {s.name
                                .split(" ")
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join("")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{s.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.admission_number}
                            {s.class_name ? ` · ${s.class_name}` : ""}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student detail + actionable gatepasses */}
      {selectedStudent && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-14">
                {selectedStudent.profile_picture ? (
                  <AvatarImage
                    src={selectedStudent.profile_picture}
                    alt={selectedStudent.name}
                  />
                ) : (
                  <AvatarFallback className="text-base">
                    {selectedStudent.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">
                  {selectedStudent.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {selectedStudent.admission_number}
                  {selectedStudent.class_name
                    ? ` · ${selectedStudent.class_name}`
                    : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setSelectedStudent(null)}
              >
                <User className="mr-1 size-4" /> Change
              </Button>
            </div>

            <hr />

            {approvedGpQuery.isLoading ||
            activeGpQuery.isLoading ||
            overdueGpQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : actionableGatepasses.length === 0 ? (
              <div className="rounded-md border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                No approved or open gatepasses for this student.
                <br />
                Ask the warden to approve before allowing departure.
              </div>
            ) : (
              <ul className="space-y-3">
                {actionableGatepasses.map((gp) => (
                  <GatekeeperGatepass
                    key={gp.id}
                    gp={gp}
                    busy={checkout.isPending || checkin.isPending}
                    onCheckout={() => handleCheckout(gp)}
                    onCheckin={() => handleCheckin(gp)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GatekeeperGatepass({
  gp,
  busy,
  onCheckout,
  onCheckin,
}: {
  gp: HostelGatepass;
  busy: boolean;
  onCheckout: () => void;
  onCheckin: () => void;
}) {
  const TypeIcon = gp.type === "night_out" ? Moon : Sun;
  const isApproved = gp.status === "approved";
  const isOpen = gp.status === "active" || gp.status === "overdue";

  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TypeIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium capitalize">
              {gp.type.replace("_", " ")}
            </span>
            <StatusBadge status={gp.status} />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {new Date(gp.departure_datetime).toLocaleString()}
            {" → "}
            {new Date(gp.expected_return_datetime).toLocaleString()}
          </p>
          {gp.reason && (
            <p className="text-xs text-muted-foreground">Reason: {gp.reason}</p>
          )}
          <p className="flex items-center gap-1.5 text-xs">
            <PhoneCall className="size-3.5 text-muted-foreground" />
            <a
              href={`tel:${gp.parent_phone.replace(/\s+/g, "")}`}
              className="text-primary hover:underline"
            >
              {gp.parent_phone}
            </a>
            {gp.type === "night_out" && (
              <Badge variant="outline" className="ml-1">
                Call before approving
              </Badge>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {isApproved && (
          <Button
            size="lg"
            className="h-12 flex-1"
            onClick={onCheckout}
            disabled={busy}
          >
            <ArrowUpFromLine className="mr-2 size-4" />
            {busy ? "Recording…" : "Mark departure"}
          </Button>
        )}
        {isOpen && (
          <Button
            size="lg"
            className="h-12 flex-1"
            variant={gp.status === "overdue" ? "destructive" : "default"}
            onClick={onCheckin}
            disabled={busy}
          >
            <ArrowDownToLine className="mr-2 size-4" />
            {busy
              ? "Recording…"
              : gp.status === "overdue"
                ? "Mark late return"
                : "Mark return"}
          </Button>
        )}
      </div>
    </li>
  );
}
