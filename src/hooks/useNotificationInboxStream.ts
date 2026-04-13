"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers";
import { notificationKeys } from "@/hooks/useNotifications";
import { getApiUrl } from "@/lib/constants";
import { shouldRefreshNotificationsOnEvent } from "@/lib/notificationRealtime";
import { getAccessToken, getRefreshToken, getTenantId } from "@/lib/storage";

const RETRY_MS = 2800;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

/** Parse one SSE block (after split on blank line). */
function parseSseEventBlock(block: string): { event: string; data: unknown } | null {
  const lines = block.split("\n").filter((l) => l.length > 0);
  if (!lines.length) return null;
  if (lines.every((l) => l.startsWith(":"))) return null;

  let eventName = "message";
  const dataParts: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataParts.push(line.slice(5).trimStart());
    }
  }
  if (!dataParts.length) return null;
  const raw = dataParts.join("\n");
  try {
    return { event: eventName, data: JSON.parse(raw) as unknown };
  } catch {
    return { event: eventName, data: raw };
  }
}

async function consumeOneSseConnection(
  queryClient: ReturnType<typeof useQueryClient>,
  signal: AbortSignal
): Promise<void> {
  const [accessToken, refreshToken, tenantId] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
    getTenantId(),
  ]);
  if (!accessToken) {
    await sleep(RETRY_MS, signal);
    return;
  }

  const url = getApiUrl("/api/notifications/stream");
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    Authorization: `Bearer ${accessToken}`,
  };
  if (refreshToken) headers["X-Refresh-Token"] = refreshToken;
  if (tenantId) headers["X-Tenant-ID"] = tenantId;

  const response = await fetch(url, {
    method: "GET",
    headers,
    signal,
    cache: "no-store",
  });

  if (response.status === 401) {
    const { clearAuth } = await import("@/lib/storage");
    await clearAuth();
    if (typeof window !== "undefined") window.location.replace("/login");
    return;
  }

  if (!response.ok || !response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const rawBlock of parts) {
      const parsed = parseSseEventBlock(rawBlock.trim());
      if (!parsed) continue;
      if (shouldRefreshNotificationsOnEvent(parsed.event)) {
        void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }
    }
  }
}

async function runStreamLoop(
  queryClient: ReturnType<typeof useQueryClient>,
  signal: AbortSignal
): Promise<void> {
  while (!signal.aborted) {
    try {
      await consumeOneSseConnection(queryClient, signal);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    if (signal.aborted) return;
    try {
      await sleep(RETRY_MS, signal);
    } catch {
      return;
    }
  }
}

/**
 * Redis-backed SSE: named `event:` frames (`system.connected`, `inbox.created`, …).
 * Triggers React Query invalidation on inbox.* events only (no polling).
 */
export function useNotificationInboxStream() {
  const queryClient = useQueryClient();
  const { isFeatureEnabled, user } = useAuth();
  const enabled = isFeatureEnabled("notifications") && Boolean(user);

  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();
    void runStreamLoop(queryClient, ac.signal);
    return () => ac.abort();
  }, [enabled, queryClient, user?.id]);
}
