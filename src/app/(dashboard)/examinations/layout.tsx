import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";

/** Covers every examination route — list, detail, marking, corrections,
 *  results — so a typed URL is refused the same way a hidden nav link is. */
export default function ExaminationsLayout({ children }: { children: React.ReactNode }) {
  return <FeatureRequiredPage feature="examinations">{children}</FeatureRequiredPage>;
}
