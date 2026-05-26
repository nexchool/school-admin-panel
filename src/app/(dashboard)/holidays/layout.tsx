import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";

export default function HolidaysLayout({ children }: { children: React.ReactNode }) {
  return <FeatureRequiredPage feature="holiday_management">{children}</FeatureRequiredPage>;
}
