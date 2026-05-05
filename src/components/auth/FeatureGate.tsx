"use client";

import { ReactNode } from "react";
import { useAuth } from "@/components/providers";

interface FeatureGateProps {
  feature: string;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders `children` only when the given tenant feature is
 * enabled. Use for inline UI fragments — buttons, table columns, sidebar
 * links, dashboard widgets — that should disappear when the super-admin
 * has disabled the feature for this tenant.
 *
 *   <FeatureGate feature="transport">
 *     <TransportSummaryColumn />
 *   </FeatureGate>
 *
 * For full-page route guards use `FeatureRequiredPage` instead so users
 * who arrive via a direct URL see an explanation rather than a blank screen.
 */
export function FeatureGate({ feature, fallback = null, children }: FeatureGateProps) {
  const { isFeatureEnabled } = useAuth();
  if (!isFeatureEnabled(feature)) return <>{fallback}</>;
  return <>{children}</>;
}
