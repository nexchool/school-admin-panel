"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NEXCHOOL_PRIVACY_URL,
  NEXCHOOL_TERMS_URL,
  SUPPORT_EMAIL,
} from "@/lib/externalLinks";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * The sign-in form (and multi-tenant choice screen). Rendered inside a login
 * layout's form panel — owns validation, the login call, error/loading state,
 * and the forgot-password link. It does not lay out the page.
 */
export function LoginForm() {
  const router = useRouter();
  const { login, pendingTenantChoice, loginWithTenant, clearPendingTenantChoice } =
    useAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginValues) => {
    setError(null);
    try {
      const result = await login(data.email, data.password);
      if (!result.requiresTenantChoice) {
        router.replace("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(String(msg));
    }
  };

  if (pendingTenantChoice) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Select school</h1>
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
              onClick={() => loginWithTenant(t.id).then(() => router.replace("/dashboard"))}
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
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your admin account.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@school.edu"
            autoComplete="email"
            {...form.register("email")}
          />
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
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        <a
          href={NEXCHOOL_TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Terms of service
        </a>
        <span className="px-2 text-border">·</span>
        <a
          href={NEXCHOOL_PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Privacy policy
        </a>
        <span className="px-2 text-border">·</span>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Nexchool admin support")}`}
          className="underline underline-offset-2 hover:text-foreground"
        >
          Contact support
        </a>
      </p>
    </div>
  );
}
