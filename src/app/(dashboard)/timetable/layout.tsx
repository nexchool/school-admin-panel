import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";

export default function TimetableLayout({ children }: { children: React.ReactNode }) {
  return <FeatureRequiredPage feature="timetable">{children}</FeatureRequiredPage>;
}
