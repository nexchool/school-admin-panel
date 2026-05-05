"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SubjectsSetup } from "@/components/structural/SubjectsSetup";

/**
 * Default behavior: redirect to /academics/subjects (canonical location).
 * Setup mode: render the minimal "assign subjects to programme + grade"
 * flow used by the school-setup dashboard, so admins can complete the
 * Subjects card without leaving the setup track.
 */
export default function SubjectsPage() {
  const router = useRouter();
  const search = useSearchParams();
  const isSetupMode = search?.get("mode") === "setup";

  useEffect(() => {
    if (!isSetupMode) {
      router.replace("/academics/subjects");
    }
  }, [isSetupMode, router]);

  if (!isSetupMode) return null;
  return <SubjectsSetup />;
}
