/**
 * Re-export useAuth for convenient imports: import { useAuth } from "@/hooks"
 */
export { useAuth } from "@/components/providers";
export {
  useNotificationFeed,
  useNotificationDetail,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  flattenNotificationPages,
} from "./useNotifications";
export { useNotificationInboxStream } from "./useNotificationInboxStream";
