"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bus, Loader2, Pencil, Trash2, Users } from "lucide-react";
import { FeeStructureFormModal } from "@/components/finance/FeeStructureFormModal";
import { useFeeStructure, useDeleteFeeStructure } from "@/hooks/useFeeStructures";

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("en-IN");
  } catch {
    return s;
  }
}

function fmtAmount(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function FeeStructureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;
  const [editOpen, setEditOpen] = useState(false);

  const { data: structure, isLoading } = useFeeStructure(id);
  const { mutate: deleteStructure, isPending: deleting } = useDeleteFeeStructure();

  const totalAmount =
    structure?.components?.reduce((sum, c) => sum + (c.amount ?? 0), 0) ?? 0;

  const handleDelete = async () => {
    if (!id || !confirm(`Delete "${structure?.name}"? This cannot be undone.`)) return;
    deleteStructure(id, {
      onSuccess: () => router.push("/dashboard/finance/structures"),
      onError: (err) => alert(err instanceof Error ? err.message : "Delete failed"),
    });
  };

  if (isLoading || !id) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Fee structure not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/finance/structures">Back to Structures</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/finance/structures">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{structure.name}</h1>
              {structure.is_transport_only && (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  <Bus className="size-3" />
                  Transport
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Due {fmtDate(structure.due_date)}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="size-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-2"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Structure configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{structure.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Due Date</p>
                <p className="text-sm">{fmtDate(structure.due_date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Amount</p>
                <p className="text-sm font-semibold">{fmtAmount(totalAmount)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Type</p>
                <p className="text-sm">
                  {structure.is_transport_only ? "Transport fee" : "General fee"}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Classes</p>
              {structure.class_ids?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {structure.class_ids.map((cid, i) => (
                    <span
                      key={cid}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs"
                    >
                      <Users className="size-3 text-muted-foreground" />
                      {structure.class_name
                        ? structure.class_name.split(",")[i]?.trim()
                        : `Class ${i + 1}`}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">All classes in academic year</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Components */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Components</CardTitle>
            <CardDescription>
              {structure.components?.length ?? 0} component
              {(structure.components?.length ?? 0) !== 1 ? "s" : ""} · Total{" "}
              {fmtAmount(totalAmount)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {structure.components?.length ? (
              <ul className="divide-y">
                {structure.components.map((c, i) => (
                  <li key={c.id ?? i} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      {c.is_optional && (
                        <p className="text-xs text-muted-foreground">Optional</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold">{fmtAmount(c.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No components defined.</p>
            )}
            {structure.components?.length ? (
              <div className="mt-3 flex justify-between border-t pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>{fmtAmount(totalAmount)}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* View assigned students */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium">Student Assignments</p>
            <p className="text-sm text-muted-foreground">
              View all students assigned to this fee structure.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/finance/student-fees?fee_structure_id=${id}`}>
              View Students
            </Link>
          </Button>
        </CardContent>
      </Card>

      <FeeStructureFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialData={structure}
        onSuccess={() => setEditOpen(false)}
      />
    </div>
  );
}
