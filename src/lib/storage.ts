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
