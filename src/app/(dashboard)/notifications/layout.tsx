import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <FeatureRequiredPage feature="notifications">{children}</FeatureRequiredPage>;
}
