export interface AppNotification {
  id: string;
  user_id: string | null;
  type: string;
  channel: string;
  title: string;
  body: string | null;
  read_at: string | null;
  extra_data: Record<string, unknown> | null;
  created_at: string | null;
  recipient_id?: string;
  recipient_status?: string;
}

export interface NotificationsListResponse {
  notifications: AppNotification[];
}

export const NOTIFICATION_TYPE = {
  TEACHER_LEAVE_REQUEST: "TEACHER_LEAVE_REQUEST",
  TEACHER_LEAVE_APPROVED: "TEACHER_LEAVE_APPROVED",
  TEACHER_LEAVE_REJECTED: "TEACHER_LEAVE_REJECTED",
  TEACHER_UNAVAILABILITY_ADDED: "TEACHER_UNAVAILABILITY_ADDED",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];
