import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";

export default function HostelLayout({ children }: { children: React.ReactNode }) {
  return <FeatureRequiredPage feature="hostel">{children}</FeatureRequiredPage>;
}
