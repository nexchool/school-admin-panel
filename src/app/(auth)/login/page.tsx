"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks";
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
import {
  NEXCHOOL_PRIVACY_URL,
  NEXCHOOL_TERMS_URL,
  SUPPORT_EMAIL,
} from "@/lib/externalLinks";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, pendingTenantChoice, loginWithTenant, clearPendingTenantChoice } =
    useAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
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
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Select School</CardTitle>
            <CardDescription>
              You have access to multiple schools. Choose one to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
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
            <Button
              variant="ghost"
              className="w-full"
              onClick={clearPendingTenantChoice}
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>School ERP Admin</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
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
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
        </CardContent>
      </Card>

      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
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
