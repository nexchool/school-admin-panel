"use client";

import { useQuery } from "@tanstack/react-query";

import {
  subscriptionService,
  type SubscriptionState,
} from "@/services/subscriptionService";
import { useAuth } from "@/components/providers/AuthProvider";

export const subscriptionKeys = {
  state: ["subscription", "state"] as const,
};

export function useSubscriptionState() {
  const { tenantId } = useAuth();
  return useQuery<SubscriptionState>({
    queryKey: [...subscriptionKeys.state, tenantId],
    queryFn: () => subscriptionService.state(),
    enabled: !!tenantId,
    // Refresh occasionally so a trial expiry / suspension is reflected
    // without a full reload — but don't hammer the server.
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}
