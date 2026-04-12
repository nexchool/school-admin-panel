import { redirect } from "next/navigation";

/** @deprecated Use /dashboard/settings/subjects */
export default function LegacySubjectsRedirectPage() {
  redirect("/dashboard/settings/subjects");
}
