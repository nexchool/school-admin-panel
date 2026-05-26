export interface User {
  id: number;
  email: string;
  name?: string;
  email_verified?: boolean;
  profile_picture_url?: string;
  default_unit_id?: string | null;
  last_login_at?: string | null;
  created_at?: string;
}
