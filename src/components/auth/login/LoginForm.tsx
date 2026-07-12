"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NEXCHOOL_PRIVACY_URL, NEXCHOOL_TERMS_URL } from "@/lib/externalLinks";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * The sign-in form (and multi-tenant choice screen). Rendered inside a login
 * layout's card — owns validation, the login call, error/loading state, the
 * password visibility toggle, and the forgot-password link. It does not lay out
 * the page.
 */
export function LoginForm() {
  const router = useRouter();
  const { login, pendingTenantChoice, loginWithTenant, clearPendingTenantChoice } =
    useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Show a confirmation when the user arrives from a completed password reset.
  // The reset page sets this sessionStorage flag before redirecting here; using
  // storage (not a query param) survives any redirect that strips the URL.
  const [resetJustCompleted, setResetJustCompleted] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("pw_reset_success") === "1") {
      setResetJustCompleted(true);
      sessionStorage.removeItem("pw_reset_success");
    }
  }, []);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginValues) => {
    setError(null);
    try {
      const result = await login(data.email, data.password);
      if (!result.requiresTenantChoice) {
        router.replace(result.forcePasswordReset ? "/set-password" : "/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(String(msg));
    }
  };

  if (pendingTenantChoice) {
    return (
      <div className="space-y-6">
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Select school</h2>
          <p className="text-sm text-muted-foreground">
            You have access to multiple schools. Choose one to continue.
          </p>
        </div>
        <div className="space-y-2">
          {pendingTenantChoice.tenants.map((t) => (
            <Button
              key={t.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() =>
                loginWithTenant(t.id).then((r) =>
                  router.replace(r.forcePasswordReset ? "/set-password" : "/dashboard")
                )
              }
            >
              {t.name} ({t.subdomain})
            </Button>
          ))}
          <Button variant="ghost" className="w-full" onClick={clearPendingTenantChoice}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to access your school admin account
        </p>
      </div>

      {resetJustCompleted && (
        <p
          className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          Your password has been reset. Sign in with your new password.
        </p>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <p
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="email"
              type="email"
              placeholder="admin@school.edu"
              autoComplete="email"
              className="pl-10"
              {...form.register("email")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pl-10 pr-10"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
        >
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          {!form.formState.isSubmitting && <ArrowRight className="size-4" aria-hidden="true" />}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By signing in, you agree to our{" "}
        <a
          href={NEXCHOOL_TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Terms of service
        </a>{" "}
        ·{" "}
        <a
          href={NEXCHOOL_PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Privacy policy
        </a>
      </p>
    </div>
  );
}
