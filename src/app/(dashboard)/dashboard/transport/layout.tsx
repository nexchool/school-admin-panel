"use client";

import { TransportSubNav } from "@/components/transport/TransportSubNav";

export default function TransportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <TransportSubNav />
      {children}
    </div>
  );
}
