"use client";

import { useQuery } from "@tanstack/react-query";

import {
  subscriptionService,
  type SubscriptionState,
} from "@/services/subscriptionService";

export const subscriptionKeys = {
  state: ["subscription", "state"] as const,
};

export function useSubscriptionState() {
  return useQuery<SubscriptionState>({
    queryKey: subscriptionKeys.state,
    queryFn: () => subscriptionService.state(),
    // Refresh occasionally so a trial expiry / suspension is reflected
    // without a full reload — but don't hammer the server.
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}
