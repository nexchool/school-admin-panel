import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "danger";
  isLoading?: boolean;
}

const VARIANT_CLASSES = {
  default:  "text-foreground",
  success:  "text-green-600",
  warning:  "text-amber-600",
  danger:   "text-red-600",
};

export function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = "default",
  isLoading,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="size-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        ) : (
          <p className={cn("text-2xl font-bold tracking-tight", VARIANT_CLASSES[variant])}>
            {value}
          </p>
        )}
        {subtext && (
          <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}
