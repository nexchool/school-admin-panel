export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'recalled';
export type AudienceScope = 'all' | 'roles' | 'classes' | 'students';
export type AudienceRole = 'admin' | 'teacher' | 'student' | 'parent';

export interface AudienceJson {
  scope: AudienceScope;
  roles?: AudienceRole[];
  class_ids?: string[];
  student_ids?: string[];
}

export interface AnnouncementAttachment {
  id: string;
  announcement_id: string | null;
  tenant_id: string;
  s3_key: string;
  original_filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_by_user_id: string | null;
  created_at: string;
}

export interface AnnouncementRevision {
  id: string;
  announcement_id: string;
  revision_number: number;
  title: string;
  body_markdown: string;
  edited_by_user_id: string | null;
  edited_by_name: string | null;
  edited_at: string | null;
  edit_note: string | null;
}

export interface Announcement {
  id: string;
  tenant_id: string;
  title: string;
  body_markdown: string;
  audience_json: AudienceJson;
  status: AnnouncementStatus;
  scheduled_at: string | null;
  published_at: string | null;
  recalled_at: string | null;
  recalled_reason: string | null;
  author_user_id: string | null;
  author_name: string | null;
  revision_count: number;
  created_at: string;
  updated_at: string;
  attachments?: AnnouncementAttachment[];
}

export interface RecipientReadStatus {
  user_id: string;
  name: string;
  read_at: string | null;
  status: string;
}

/**
 * One page of the read-receipt roster.
 *
 * `total` and `read_count` describe the whole roster, not `items` — a notice
 * to a whole school is one row per parent, so the counter has to come from the
 * server rather than from the length of the page in hand.
 */
export interface RecipientRoster {
  items: RecipientReadStatus[];
  total: number;
  read_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SystemTemplate {
  id: string;
  title: string;
  body_markdown: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  body_markdown: string;
  audience_json: AudienceJson;
}

export interface UpdateAnnouncementPayload {
  title?: string;
  body_markdown?: string;
  audience_json?: AudienceJson;
  edit_note?: string;
}
