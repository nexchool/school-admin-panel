"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { Check, Info, Loader2, TriangleAlert, X } from "lucide-react";

/**
 * App-wide toast host. Styling lives in two places that must stay in sync:
 *   - the colored status dots below (per-type icon), and
 *   - the `.toast-modern*` rules in `app/globals.css` (card, title, description,
 *     action, close).
 * Every `toast.*` / `notify.*` call in the app renders through this, so the look
 * is defined once here.
 */

const GLYPH = 13;

function Dot({
  bg,
  fg,
  children,
}: {
  bg: string;
  fg: string;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        flex: "none",
        borderRadius: 9999,
        background: bg,
        color: fg,
      }}
    >
      {children}
    </span>
  );
}

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      theme="light"
      closeButton
      gap={10}
      offset={16}
      toastOptions={{
        classNames: {
          toast: "toast-modern",
          title: "toast-modern-title",
          description: "toast-modern-desc",
          actionButton: "toast-modern-action",
          closeButton: "toast-modern-close",
          icon: "toast-modern-icon",
        },
      }}
      icons={{
        // Soft tinted dots (pale fill + saturated glyph) read premium on white.
        success: (
          <Dot bg="#dcfce7" fg="#15803d">
            <Check size={GLYPH} strokeWidth={3} />
          </Dot>
        ),
        error: (
          <Dot bg="#fee2e2" fg="#dc2626">
            <X size={GLYPH} strokeWidth={3} />
          </Dot>
        ),
        warning: (
          <Dot bg="#fef3c7" fg="#b45309">
            <TriangleAlert size={GLYPH} strokeWidth={2.5} />
          </Dot>
        ),
        info: (
          <Dot bg="#dbeafe" fg="#2563eb">
            <Info size={GLYPH} strokeWidth={2.75} />
          </Dot>
        ),
        loading: (
          <Dot bg="#e2e8f0" fg="#475569">
            <Loader2 size={GLYPH} strokeWidth={2.75} className="animate-spin" />
          </Dot>
        ),
      }}
    />
  );
}
