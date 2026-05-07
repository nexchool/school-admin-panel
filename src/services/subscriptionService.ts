/**
 * Subscription service.
 *
 * Wraps GET /api/subscription/state — used by the layout-level banner
 * and the dashboard widgets. Read-only from the tenant side; super-admin
 * mutations live in the panel app.
 */

import { apiGet } from "@/services/api";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "suspended"
  | "deleted"
  | null;

export type SubscriptionReason =
  | "Active"
  | "Trial"
  | "TrialExpired"
  | "SubscriptionSuspended"
  | "TenantDeleted"
  | "SubscriptionUnknown"
  | "TenantNotFound";

export interface SubscriptionState {
  subscription: {
    status: SubscriptionStatus;
    allow_writes: boolean;
    reason: SubscriptionReason;
    message: string;
    trial_ends_at: string | null;
    billing_cycle: string;
  };
  usage: {
    tenant_id: string;
    active_students_count: number;
    last_updated_at: string | null;
  };
  billing: {
    active_students: number;
    price_per_student_per_year: number;
    base_amount: number;
    discount_percentage: number;
    discount_active: boolean;
    discount_amount: number;
    total: number;
    currency: string;
  };
}

export const subscriptionService = {
  state: () => apiGet<SubscriptionState>("/api/subscription/state"),
};
