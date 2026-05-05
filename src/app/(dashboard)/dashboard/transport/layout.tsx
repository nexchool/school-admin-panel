"use client";

import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";
import { TransportSubNav } from "@/components/transport/TransportSubNav";

export default function TransportLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeatureRequiredPage feature="transport">
      <div className="space-y-6">
        <TransportSubNav />
        {children}
      </div>
    </FeatureRequiredPage>
  );
}
