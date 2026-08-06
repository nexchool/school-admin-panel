import { FeatureRequiredPage } from "@/components/auth/FeatureRequiredPage";

/**
 * Bell schedules are the periods a timetable is built on — the API gates them
 * behind `timetable`, so the pages have to agree. Without this, a school with
 * timetables switched off could still reach these by URL and get an empty
 * screen built out of 403s.
 */
export default function BellSchedulesLayout({ children }: { children: React.ReactNode }) {
  return <FeatureRequiredPage feature="timetable">{children}</FeatureRequiredPage>;
}
