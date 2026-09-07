"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks";
import { requestMobileOtp } from "@/services/authService";
import { toastError } from "@/lib/errorToast";

/**
 * Signing in with a code sent to a phone.
 *
 * Two steps, and the wording of the first is the careful part. Asking for a
 * code answers the same way whether or not the number belongs to anybody —
 * the server will not say, because saying would turn this box into a way to
 * find out who banks with which school. So the confirmation is deliberately
 * conditional ("if that number can sign in here"), and the form moves to the
 * code step either way.
 *
 * Only rendered when the school's authentication policy publishes the method.
 */
export function MobileOtpForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { loginWithMobileOtp } = useAuth();

  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | undefined>();
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askForCode = async () => {
    setError(null);
    setBusy(true);
    try {
      const response = await requestMobileOtp({ mobile });
      // No challenge id means the server declined to say why. That is the
      // designed answer, not a failure, so the form advances regardless.
      setChallengeId(response.challenge_id);
      setStep("code");
    } catch (caught) {
      toastError(caught, "Couldn't send a code");
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    setError(null);
    setBusy(true);
    try {
      const { forcePasswordReset } = await loginWithMobileOtp(
        mobile,
        code,
        challengeId,
      );
      router.push(forcePasswordReset ? "/set-password" : "/dashboard");
    } catch {
      // One message for a wrong code, an expired one and a spent one — the
      // server does not distinguish them and neither should this.
      setError("That code didn't work. Check it, or ask for a new one.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "mobile") {
    return (
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void askForCode();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="mobile"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              className="pl-9"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
            />
          </div>
        </div>

        <Button type="submit" className="w-full gap-2" disabled={busy || !mobile.trim()}>
          {busy ? "Sending…" : "Send me a code"}
          <ArrowRight className="size-4" />
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Sign in with a password instead
        </button>
      </form>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submitCode();
      }}
    >
      <p className="text-sm text-muted-foreground">
        If that number can sign in here, a code is on its way. It expires in a
        few minutes.
      </p>

      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <div className="relative">
          <ShieldCheck className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="pl-9 tracking-[0.3em]"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full gap-2" disabled={busy || code.length < 6}>
        {busy ? "Checking…" : "Sign in"}
        <ArrowRight className="size-4" />
      </Button>

      <button
        type="button"
        onClick={() => {
          setStep("mobile");
          setCode("");
        }}
        className="w-full text-sm text-muted-foreground hover:text-foreground"
      >
        Use a different number
      </button>
    </form>
  );
}
