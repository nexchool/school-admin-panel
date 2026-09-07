"use client";

import { Receipt } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscriptionState } from "@/hooks/useSubscription";
import type { ServiceCharge } from "@/services/subscriptionService";

/**
 * What the school is estimated to pay over a year, broken into its parts.
 *
 * Until now the bill was one number, because there was only ever one thing to
 * charge for: students, once a year, at one rate. A school that also uses a
 * paid service bought from somebody else — an SMS bundle, say — should be able
 * to see which part of its bill is which rather than being handed a larger
 * total with no explanation.
 *
 * Two things this deliberately does not show. **It is not an invoice**, and
 * says so: NexSchool has no invoices, these are projections from today's
 * headcount and expected usage, and a screen that looked like a bill would be
 * read as one. And **it never shows what NexSchool pays its own providers** —
 * that is a supplier negotiation, the server strips it before the payload
 * leaves, and there is no field here to render it into.
 */
export function EstimatedAnnualBill() {
  const { data } = useSubscriptionState();
  const billing = data?.billing;
  if (!billing) return null;

  const services = data.services ?? [];
  const servicesTotal = services.reduce(
    (running, service) => running + service.estimated_annual_customer_charge,
    0,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-4 text-muted-foreground" />
            Estimated annual bill
          </CardTitle>
          <CardDescription>
            A projection from today&apos;s student count and expected usage —
            not an invoice.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border text-sm">
          <Line
            label="NexSchool subscription"
            detail={
              billing.active_students > 0
                ? `${billing.active_students.toLocaleString("en-IN")} students × ${money(
                    billing.price_per_student_per_year,
                  )}`
                : undefined
            }
            amount={billing.base_amount}
          />

          {billing.discount_active && (
            <Line
              label={`Discount (${billing.discount_percentage}%)`}
              amount={-billing.discount_amount}
            />
          )}

          {services.map((service) => (
            <Line
              key={service.component_key}
              label={service.service_name ?? service.service_key ?? "Service"}
              detail={describeUsage(service)}
              amount={service.estimated_annual_customer_charge}
            />
          ))}

          <div className="flex items-baseline justify-between pt-3">
            <dt className="font-medium">Estimated annual total</dt>
            <dd className="text-lg font-semibold">
              {money(billing.total + servicesTotal)}
            </dd>
          </div>
        </dl>

        {services.length === 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            No additional services are billed to this school.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** Say where a quantity came from, so an estimate is not mistaken for a count. */
function describeUsage(service: ServiceCharge): string | undefined {
  if (service.estimate_basis === "none") return "No usage recorded yet";

  const quantity = service.estimated_annual_quantity.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
  const unit = service.unit ? `${quantity} ${service.unit}` : quantity;

  return service.estimate_basis === "observed"
    ? `${unit} a year, projected from recent use`
    : `${unit} a year, estimated`;
}

function Line({
  label,
  detail,
  amount,
}: {
  label: string;
  detail?: string;
  amount: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <div>
        <dt className="font-medium">{label}</dt>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
      <dd className="shrink-0 tabular-nums">{money(amount)}</dd>
    </div>
  );
}

/** Full rupees, not the abbreviated form the tiles use — a bill is read exactly. */
function money(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}
