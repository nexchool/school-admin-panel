"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { QueryProvider } from "./QueryProvider";
import { AppToaster } from "./AppToaster";
import { ActiveScopeProvider } from "@/contexts/ActiveScopeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ActiveScopeProvider>
          {children}
          <AppToaster />
        </ActiveScopeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
