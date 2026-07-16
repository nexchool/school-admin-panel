"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * The subject catalogue moved to the top-level /subjects module (own sidebar
 * entry). This shim keeps old bookmarks and deep links working — including the
 * query string, so e.g. ?mode=setup still reaches the setup flow.
 */
export default function AcademicsSubjectsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams?.toString();
    router.replace(qs ? `/subjects?${qs}` : "/subjects");
  }, [router, searchParams]);

  return null;
}
