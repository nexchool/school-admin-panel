import { EstimatedAnnualBill } from "@/components/subscription/EstimatedAnnualBill";
import { SubscriptionWidgets } from "@/components/subscription/SubscriptionWidgets";

export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscription &amp; Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your current plan status, billable student count, and what makes up
          your estimated annual bill.
        </p>
      </div>

      <SubscriptionWidgets />
      <EstimatedAnnualBill />
    </div>
  );
}
