/**
 * Re-export useAuth for convenient imports: import { useAuth } from "@/hooks"
 */
export { useAuth } from "@/components/providers";
export {
  useNotifications,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "./useNotifications";
