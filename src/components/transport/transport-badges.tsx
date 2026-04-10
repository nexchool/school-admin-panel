import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function healthLabel(health?: string | null): "normal" | "high" | "full" | "unknown" {
  if (health === "full") return "full";
  if (health === "high") return "high";
  if (health === "normal" || health === "low") return "normal";
  return "unknown";
}

export function OccupancyHealthBadge({ health }: { health?: string | null }) {
  const h = healthLabel(health);
  const label =
    h === "full" ? "Full" : h === "high" ? "High load" : h === "normal" ? "Normal" : "—";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal",
        h === "normal" && "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        h === "high" && "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200",
        h === "full" && "border-red-500/50 bg-red-500/10 text-red-900 dark:text-red-200",
        h === "unknown" && "text-muted-foreground"
      )}
    >
      {label}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal capitalize",
        active
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          : "border-border text-muted-foreground"
      )}
    >
      {status}
    </Badge>
  );
}
