/** Must match server `InboxRealtimeEvent` + `inbox_sse` `system.*` frames. */
export const InboxRealtimeEvent = {
  INBOX_CREATED: "inbox.created",
  INBOX_READ: "inbox.read",
  INBOX_READ_ALL: "inbox.read_all",
  SYSTEM_CONNECTED: "system.connected",
  SYSTEM_PING: "system.ping",
} as const;

export type InboxRealtimeEventName =
  (typeof InboxRealtimeEvent)[keyof typeof InboxRealtimeEvent];

export function shouldRefreshNotificationsOnEvent(event: string): boolean {
  return (
    event === InboxRealtimeEvent.INBOX_CREATED ||
    event === InboxRealtimeEvent.INBOX_READ ||
    event === InboxRealtimeEvent.INBOX_READ_ALL
  );
}
