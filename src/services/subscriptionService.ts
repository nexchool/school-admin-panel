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
  /**
   * Commercials. Present only for a user holding `subscription.read` — the
   * server omits these entirely for everybody else, so they are optional
   * here. They were previously declared as always present, which is a promise
   * the API does not make.
   */
  usage?: {
    tenant_id: string;
    active_students_count: number;
    last_updated_at: string | null;
  };
  billing?: {
    active_students: number;
    price_per_student_per_year: number;
    base_amount: number;
    discount_percentage: number;
    discount_active: boolean;
    discount_amount: number;
    total: number;
    currency: string;
  };
  /**
   * Third-party services this school is charged for, each as its own line —
   * an SMS bundle, a verification service. What NexSchool pays its provider
   * is deliberately absent: the server strips it before the payload leaves,
   * so there is no field here to render it into.
   */
  services?: ServiceCharge[];
}

/** One third-party service on a school's bill. */
export interface ServiceCharge {
  component_key: string;
  service_key: string | null;
  service_name: string | null;
  unit: string | null;
  pricing_mode: string;
  is_enabled: boolean;
  estimated_annual_quantity: number;
  /** Where the quantity came from: an operator's figure, or observed usage. */
  estimate_basis: "configured" | "observed" | "none";
  estimated_annual_customer_charge: number;
  currency: string;
}

export const subscriptionService = {
  state: () => apiGet<SubscriptionState>("/api/subscription/state"),
};
