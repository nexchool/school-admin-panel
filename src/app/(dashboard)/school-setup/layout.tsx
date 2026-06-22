import { redirect } from "next/navigation";

/**
 * School Setup is hidden during white-glove onboarding (a backend seed script
 * builds the academic foundation instead). This server-component layout guards
 * the whole /school-setup route subtree — flip NEXT_PUBLIC_ENABLE_SCHOOL_SETUP
 * to "true" (e.g. in dev) to re-enable the wizard.
 */
export default function SchoolSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NEXT_PUBLIC_ENABLE_SCHOOL_SETUP !== "true") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
