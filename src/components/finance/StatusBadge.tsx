import { cn } from "@/lib/utils";

type FeeStatus = "unpaid" | "partial" | "paid" | "overdue" | string;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid:    { label: "Paid",    className: "bg-green-100 text-green-700 border-green-200" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-700 border-amber-200" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700 border-red-200" },
  unpaid:  { label: "Unpaid",  className: "bg-slate-100 text-slate-600 border-slate-200" },
  draft:   { label: "Draft",   className: "bg-slate-100 text-slate-500 border-slate-200" },
};

interface StatusBadgeProps {
  status: FeeStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        cfg.className,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}
