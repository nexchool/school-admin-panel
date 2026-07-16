"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks";
import { toastError } from "@/lib/errorToast";

/**
 * Landing page for a platform-admin one-time login link
 * (`/enter?code=...`, minted by the super-admin panel). Redeems the code for a
 * god-login session and drops the operator into the dashboard. The code is
 * single-use and short-lived, so this only works once, immediately after the
 * panel opens it.
 */
function EnterInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { loginWithCode } = useAuth();
  const code = search?.get("code") ?? null;
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    // Redeem exactly once — the code is single-use, so a re-run would 401.
    if (ran.current || !code) return;
    ran.current = true;

    loginWithCode(code)
      .then(() => router.replace("/dashboard"))
      .catch((e) => {
        toastError(e, "Login link could not be used");
        setRedeemError(
          "This login link is invalid or has expired. Generate a new one from the panel."
        );
      });
  }, [code, loginWithCode, router]);

  // Missing-code is known at render time — no effect/setState needed for it.
  const error =
    redeemError ??
    (!code
      ? "This login link is missing its code. Generate a new one from the panel."
      : null);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      {error ? (
        <>
          <h1 className="text-lg font-semibold">Couldn&apos;t sign you in</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        </>
      ) : (
        <>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </>
      )}
    </div>
  );
}

export default function EnterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EnterInner />
    </Suspense>
  );
}
