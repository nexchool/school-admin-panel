"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks";

/** How many digits a PIN has. Mirrors the server's single constant. */
const PIN_LENGTH = 6;

/**
 * Signing in with a mobile number and a PIN.
 *
 * One step, unlike the code flow: nothing has to be sent and nothing has to
 * arrive, which is the whole point of the method — a student on a bus with no
 * signal can still sign in, and the school is not charged for it.
 *
 * Only rendered when the school's authentication policy publishes the method,
 * and the server refuses it otherwise, so this hides an option rather than
 * enforcing a rule.
 */
export function MobilePinForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { loginWithMobilePin } = useAuth();

  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const { forcePasswordReset } = await loginWithMobilePin(mobile, pin);
      router.push(forcePasswordReset ? "/set-password" : "/dashboard");
    } catch {
      // One message for a wrong PIN, a number nobody holds, and a number
      // being throttled. The server does not distinguish them — telling them
      // apart would say which numbers are worth attacking.
      setError("That number and PIN didn't match.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="pin-mobile">Mobile number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="pin-mobile"
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

      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={PIN_LENGTH}
            placeholder="••••••"
            className="pl-9 tracking-[0.3em]"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={busy || !mobile.trim() || pin.length < PIN_LENGTH}
      >
        {busy ? "Signing in…" : "Sign in"}
        <ArrowRight className="size-4" />
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-muted-foreground hover:text-foreground"
      >
        Sign in another way
      </button>
    </form>
  );
}
