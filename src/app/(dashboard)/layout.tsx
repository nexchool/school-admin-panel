"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RouteGuard } from "@/components/layout/RouteGuard";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <RouteGuard>{children}</RouteGuard>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
