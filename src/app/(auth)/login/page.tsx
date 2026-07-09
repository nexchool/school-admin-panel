"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getTenantBranding } from "@/services/authService";
import { ApiException } from "@/services/api";
import { getCurrentSubdomain } from "@/lib/subdomain";
import { LoginForm } from "@/components/auth/login/LoginForm";
import { resolveLoginLayout } from "@/components/auth/login/loginLayoutRegistry";

export default function LoginPage() {
  const router = useRouter();

  const { data: brandingData, error: brandingError } = useQuery({
    queryKey: ["tenant-branding"],
    queryFn: getTenantBranding,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Redirect to school-not-found when the subdomain is set but the backend
  // returns 404 (no tenant registered for that slug).
  useEffect(() => {
    if (!brandingError) return;
    const subdomain = getCurrentSubdomain();
    if (subdomain && brandingError instanceof ApiException && brandingError.status === 404) {
      router.replace("/school-not-found");
    }
  }, [brandingError, router]);

  const Layout = resolveLoginLayout(brandingData?.login_variant);

  return (
    <Layout branding={brandingData ?? null}>
      <LoginForm />
    </Layout>
  );
}
