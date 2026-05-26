import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return <FeatureRequiredPage feature="attendance">{children}</FeatureRequiredPage>;
}
