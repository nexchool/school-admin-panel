import { apiGet, apiPost, apiPostForm, apiPut } from "./api";
import { API_ENDPOINTS } from "@/lib/constants";

export interface TenantChoice {
  id: string;
  name: string;
  subdomain: string;
}

export interface LoginResponse {
  access_token?: string;
  refresh_token?: string;
  tenant_id?: string;
  subdomain?: string;
  user?: {
    id: number;
    email: string;
    name?: string;
    email_verified?: boolean;
    profile_picture_url?: string;
  };
  permissions?: string[];
  enabled_features?: string[];
  requires_tenant_choice?: boolean;
  tenants?: TenantChoice[];
}

export interface MessageResponse {
  message: string;
}

export const login = (data: {
  email: string;
  password: string;
  tenant_id?: string;
  subdomain?: string;
}) => apiPost<LoginResponse>(API_ENDPOINTS.LOGIN, data);

export const logout = () => apiPost<unknown>(API_ENDPOINTS.LOGOUT);

export const forgotPassword = (data: { email: string }) =>
  apiPost<MessageResponse>(API_ENDPOINTS.FORGOT_PASSWORD, data);

export interface ProfileUser {
  id: number;
  email: string;
  name?: string;
  email_verified?: boolean;
  profile_picture_url?: string;
  last_login_at?: string | null;
  created_at?: string;
}

export interface ProfileRole {
  id: string;
  name: string;
  description?: string | null;
}

/** GET /api/auth/profile — nested user, roles, permissions, enabled_features */
export interface ProfileResponse {
  user: ProfileUser;
  roles: ProfileRole[];
  permissions: string[];
  enabled_features: string[];
}

export const getProfile = () => apiGet<ProfileResponse>(API_ENDPOINTS.PROFILE);

export interface UpdateProfileResponse {
  user: ProfileUser;
  message?: string;
}

export const updateProfile = (data: { name?: string; profile_picture_url?: string }) =>
  apiPut<UpdateProfileResponse>(API_ENDPOINTS.PROFILE, data);

export const uploadProfilePicture = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiPostForm<{ profile_picture_url: string; message?: string }>(
    API_ENDPOINTS.UPLOAD_PROFILE_PICTURE,
    formData
  );
};
