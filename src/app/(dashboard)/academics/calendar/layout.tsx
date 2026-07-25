import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";

export default function AcademicCalendarLayout({ children }: { children: React.ReactNode }) {
  return <FeatureRequiredPage feature="academic_calendar">{children}</FeatureRequiredPage>;
}
