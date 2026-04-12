import { redirect } from "next/navigation";

// Invoices have been unified into Student Fees (StudentFee = invoice).
// This route is retired.
export default function RetiredInvoicesPage() {
  redirect("/dashboard/finance/student-fees");
}
