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
  /** Resolved school / tenant display name (same as Tenant.name). */
  tenant_name?: string | null;
  user?: {
    id: number;
    email: string;
    name?: string;
    email_verified?: boolean;
    profile_picture_url?: string;
  };
  permissions?: string[];
  enabled_features?: string[];
  /** True when the user is a platform super-admin (god mode). */
  is_platform_admin?: boolean;
  /** True when the user is a tenant sub-admin. */
  is_subadmin?: boolean;
  /** The active tenant's school-setup completion state. */
  is_setup_complete?: boolean;
  /** True when the user must set a new password before continuing. */
  force_password_reset?: boolean;
  /**
   * Branch (school-unit) ids the user is restricted to. `null` (or absent) =
   * unrestricted (all branches); an array is the explicit allowed set.
   */
  allowed_unit_ids?: string[] | null;
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

/**
 * Redeem a one-time platform-admin login link. The backend returns the same
 * shape as a normal login, scoped to the target tenant (god-login session).
 */
export const redeemLoginLink = (code: string) =>
  apiPost<LoginResponse>(API_ENDPOINTS.REDEEM_LOGIN_LINK, { code });

export const forgotPassword = (data: { email: string }) =>
  apiPost<MessageResponse>(API_ENDPOINTS.FORGOT_PASSWORD, {
    email: data.email,
    platform: "web",
  });

export const resetPassword = (data: {
  email: string;
  token: string;
  new_password: string;
}) => apiPost<MessageResponse>(API_ENDPOINTS.RESET_PASSWORD, data);

export const forceResetPassword = (data: { new_password: string }) =>
  apiPost<MessageResponse>(API_ENDPOINTS.FORCE_RESET_PASSWORD, data);

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
  /** School / tenant display name */
  tenant_name?: string | null;
  roles: ProfileRole[];
  permissions: string[];
  enabled_features: string[];
  /** True when the user is a platform super-admin (god mode). */
  is_platform_admin?: boolean;
  /** True when the user is a tenant sub-admin. */
  is_subadmin?: boolean;
  /** The active tenant's school-setup completion state. */
  is_setup_complete?: boolean;
  /** True when the user must set a new password before continuing. */
  force_password_reset?: boolean;
  /**
   * Branch (school-unit) ids the user is restricted to. `null` (or absent) =
   * unrestricted (all branches); an array is the explicit allowed set.
   */
  allowed_unit_ids?: string[] | null;
}

export const getProfile = () => apiGet<ProfileResponse>(API_ENDPOINTS.PROFILE);

/** Public branding for the resolved tenant, shown pre-auth on the login screen. */
export interface TenantBranding {
  name: string;
  subdomain?: string;
  logo_url?: string | null;
  tagline?: string | null;
  /** Opt-in per-tenant login layout key; "default" (or absent) = standard login. */
  login_variant?: string;
}

/** GET /api/auth/tenant-branding — public; branding for resolved tenant (Host / header / default). */
export const getTenantBranding = () =>
  apiGet<TenantBranding>(API_ENDPOINTS.TENANT_BRANDING);

/** Same as getTenantBranding but catches errors (e.g. no tenant context) for pre-login UI. */
export async function getTenantBrandingSafe(): Promise<string | null> {
  try {
    const { name } = await getTenantBranding();
    const n = (name ?? "").trim();
    return n || null;
  } catch {
    return null;
  }
}

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
