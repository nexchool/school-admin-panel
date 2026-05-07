import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <FeatureRequiredPage feature="fees_management">{children}</FeatureRequiredPage>;
}
