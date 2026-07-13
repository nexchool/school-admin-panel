"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/providers";
import { forceResetPassword } from "@/services/authService";
import { setPasswordSchema, type SetPasswordValues } from "@/lib/passwordSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SetPasswordPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  useEffect(() => {
    // This screen requires an authenticated session (tokens already stored).
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  const onSubmit = async (data: SetPasswordValues) => {
    setError(null);
    try {
      await forceResetPassword({ new_password: data.new_password });
      // Refresh the profile so the cleared force flag flows into context and the
      // dashboard is no longer gated.
      await refreshUser();
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not set password";
      setError(String(msg));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold tracking-tight">
            Set your password
          </CardTitle>
          <CardDescription>
            You must set a new password before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            {error && (
              <p
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="new_password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pl-10 pr-10"
                  {...form.register("new_password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.new_password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.new_password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm password</Label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="confirm_password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pl-10"
                  {...form.register("confirm_password")}
                />
              </div>
              {form.formState.errors.confirm_password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.confirm_password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full"
            >
              {form.formState.isSubmitting ? "Saving…" : "Set password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
