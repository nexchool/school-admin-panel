const isDev = process.env.NODE_ENV === "development";

/** Backend API base URL - dev uses NEXT_PUBLIC_API_URL_DEV, prod uses NEXT_PUBLIC_API_URL */
const apiBaseFromEnv =
  (isDev ? process.env.NEXT_PUBLIC_API_URL_DEV : process.env.NEXT_PUBLIC_API_URL) ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_URL_DEV ??
  "";

function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined" && apiBaseFromEnv.startsWith("http://api:")) {
    return "";
  }
  if (apiBaseFromEnv) return apiBaseFromEnv.replace(/\/$/, "");
  if (typeof window === "undefined") return "";

  const port = window.location.port;
  if (port !== "3000" && port !== "3001") return "";

  const gw = (process.env.NEXT_PUBLIC_GATEWAY_ORIGIN ?? "").trim().replace(/\/$/, "");
  if (gw) return gw;
  return `${window.location.protocol}//${window.location.hostname}:80`;
}

// Legacy: env-only; prefer getApiUrl() which applies gateway when on :3000/:3001.
export const API_BASE_URL =
  typeof window !== "undefined" && apiBaseFromEnv.startsWith("http://api:")
    ? ""
    : apiBaseFromEnv;

export const API_ENDPOINTS = {
  REGISTER: "/api/auth/register",
  LOGIN: "/api/auth/login",
  LOGOUT: "/api/auth/logout",
  FORGOT_PASSWORD: "/api/auth/password/forgot",
  RESET_PASSWORD: "/api/auth/password/reset",
  ENABLED_FEATURES: "/api/auth/enabled-features",
  PROFILE: "/api/auth/profile",
  UPLOAD_PROFILE_PICTURE: "/api/auth/upload-profile-picture",
} as const;

export function getApiUrl(endpoint: string): string {
  const base = resolveApiBaseUrl().replace(/\/+$/, "");
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (base.endsWith("/api") && path.startsWith("/api")) {
    const rest = path.replace(/^\/api/, "") || "/";
    return `${base}${rest}`;
  }
  return `${base}${path}`;
}
