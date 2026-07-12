/**
 * Browser localStorage wrapper for auth tokens and user data.
 * Keys aligned with mobile app for consistency.
 */

const KEYS = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  USER_DATA: "user_data",
  PERMISSIONS: "permissions",
  ENABLED_FEATURES: "enabled_features",
  USER_ROLES: "user_roles",
  TENANT_ID: "tenant_id",
  /** Cached school / tenant display name for UI (sidebar, etc.). */
  TENANT_NAME: "tenant_display_name",
  /** Whether the logged-in user is a platform super-admin (god mode). */
  IS_PLATFORM_ADMIN: "is_platform_admin",
  /** Whether the logged-in user is a tenant sub-admin. */
  IS_SUBADMIN: "is_subadmin",
  /** Whether the active tenant's school setup is complete. */
  IS_SETUP_COMPLETE: "is_setup_complete",
  /** Whether the logged-in user must set a new password before continuing. */
  FORCE_PASSWORD_RESET: "force_password_reset",
  /**
   * Branch (school-unit) ids the user is restricted to. Absent key = never
   * persisted; stored `"null"` = unrestricted (all branches); JSON array =
   * the allowed set.
   */
  ALLOWED_UNIT_IDS: "allowed_unit_ids",
} as const;

export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.ACCESS_TOKEN);
}

export async function setAccessToken(token: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.ACCESS_TOKEN, token);
}

export async function getRefreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.REFRESH_TOKEN);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.REFRESH_TOKEN, token);
}

export async function getUserData(): Promise<{
  id: number;
  email: string;
  name?: string;
  email_verified?: boolean;
  profile_picture_url?: string;
  last_login_at?: string | null;
  created_at?: string;
} | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.USER_DATA);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setUserData(user: object): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
}

export async function getPermissions(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.PERMISSIONS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setPermissions(perms: string[]): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.PERMISSIONS, JSON.stringify(perms));
}

export async function getEnabledFeatures(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.ENABLED_FEATURES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setEnabledFeatures(features: string[]): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.ENABLED_FEATURES, JSON.stringify(features));
}

export interface StoredRole {
  id: string;
  name: string;
  description?: string | null;
}

export async function getRoles(): Promise<StoredRole[]> {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEYS.USER_ROLES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredRole[]) : [];
  } catch {
    return [];
  }
}

export async function setRoles(roles: StoredRole[]): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.USER_ROLES, JSON.stringify(roles));
}

export async function getTenantId(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.TENANT_ID);
}

export async function setTenantId(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.TENANT_ID, id);
}

export async function getTenantName(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.TENANT_NAME);
  if (!raw) return null;
  const t = raw.trim();
  return t ? t : null;
}

export async function setTenantName(name: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  if (name === null || name.trim() === "") {
    localStorage.removeItem(KEYS.TENANT_NAME);
  } else {
    localStorage.setItem(KEYS.TENANT_NAME, name.trim());
  }
}

/**
 * Boolean flag helpers. A flag is "true" only when its stored string is exactly
 * `"true"`. A `null` default (returned when the key is absent) lets callers
 * distinguish "never persisted" from an explicit `false` if they ever need to —
 * but most callers just coerce with `?? <default>`.
 */
async function getBoolFlag(key: string): Promise<boolean | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  return raw === "true";
}

async function setBoolFlag(key: string, value: boolean): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value ? "true" : "false");
}

export async function getIsPlatformAdmin(): Promise<boolean | null> {
  return getBoolFlag(KEYS.IS_PLATFORM_ADMIN);
}

export async function setIsPlatformAdmin(value: boolean): Promise<void> {
  return setBoolFlag(KEYS.IS_PLATFORM_ADMIN, value);
}

export async function getIsSubAdmin(): Promise<boolean | null> {
  return getBoolFlag(KEYS.IS_SUBADMIN);
}

export async function setIsSubAdmin(value: boolean): Promise<void> {
  return setBoolFlag(KEYS.IS_SUBADMIN, value);
}

export async function getIsSetupComplete(): Promise<boolean | null> {
  return getBoolFlag(KEYS.IS_SETUP_COMPLETE);
}

export async function setIsSetupComplete(value: boolean): Promise<void> {
  return setBoolFlag(KEYS.IS_SETUP_COMPLETE, value);
}

export async function getForcePasswordReset(): Promise<boolean | null> {
  return getBoolFlag(KEYS.FORCE_PASSWORD_RESET);
}

export async function setForcePasswordReset(value: boolean): Promise<void> {
  return setBoolFlag(KEYS.FORCE_PASSWORD_RESET, value);
}

/**
 * Branch (school-unit) restriction. `null` means unrestricted (all branches);
 * an array is the explicit allowed set. The key being absent (never persisted)
 * is also surfaced as `null` so callers default to "unrestricted".
 */
export async function getAllowedUnitIds(): Promise<string[] | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.ALLOWED_UNIT_IDS);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

export async function setAllowedUnitIds(
  value: string[] | null
): Promise<void> {
  if (typeof window === "undefined") return;
  // Store `null` verbatim so hydration can distinguish "unrestricted" from a
  // genuine empty allow-list (which would lock the user out of every branch).
  localStorage.setItem(KEYS.ALLOWED_UNIT_IDS, JSON.stringify(value));
}

export async function clearAuth(): Promise<void> {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  document.cookie =
    "admin-web-session=; path=/; max-age=0; SameSite=Lax";
}

/** Set session cookie for middleware (route protection). Call on login. */
export function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie =
    "admin-web-session=1; path=/; max-age=86400; SameSite=Lax";
}
