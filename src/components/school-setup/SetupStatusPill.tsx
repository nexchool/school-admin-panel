"use client";

import Link from "next/link";
import { CheckCircle2, AlertTriangle } from "lucide-react";

import { useSetupStatus } from "@/hooks/useSchoolSetup";

export function SetupStatusPill() {
  const { data } = useSetupStatus();
  if (!data) return null;

  if (data.overall.is_setup_complete && !data.overall.needs_reconfirm) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="size-3" />
        Setup complete
      </span>
    );
  }

  return (
    <Link
      href="/school-setup"
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
    >
      <AlertTriangle className="size-3" />
      {data.overall.needs_reconfirm
        ? "Reconfirm setup"
        : "Setup incomplete · finish now"}
    </Link>
  );
}
