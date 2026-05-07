"use client";

import { type ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "./AuthProvider";
import { QueryProvider } from "./QueryProvider";
import { ActiveScopeProvider } from "@/contexts/ActiveScopeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ActiveScopeProvider>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </ActiveScopeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
