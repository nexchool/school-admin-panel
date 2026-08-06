import { getApiUrl } from "@/lib/constants";
import { isPublicAuthApiUrl } from "@/lib/auth-api";
import { noteFeatureStamp } from "@/lib/featureStamp";
import { notifyForbidden } from "@/lib/forbiddenHandler";
import { getCurrentSubdomain } from "@/lib/subdomain";
import {
  getAccessToken,
  getRefreshToken,
  getTenantId,
  setAccessToken,
} from "@/lib/storage";

export class ApiException extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.data = data;
  }
}

const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
  skipJsonContentType = false
): Promise<Response> => {
  const url = getApiUrl(endpoint);
  const [accessToken, refreshToken, tenantId] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
    getTenantId(),
  ]);

  const headers: Record<string, string> = skipJsonContentType
    ? { ...(options.headers as Record<string, string>) }
    : {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  if (refreshToken) {
    headers["X-Refresh-Token"] = refreshToken;
  }
  if (tenantId) {
    headers["X-Tenant-ID"] = tenantId;
  } else {
    // Pre-login: no tenant_id stored yet — send subdomain from URL so backend
    // can resolve tenant without relying solely on nginx Host forwarding.
    const subdomain = getCurrentSubdomain();
    if (subdomain) {
      headers["X-Tenant-Subdomain"] = subdomain;
    }
  }

  try {
    // cache: "no-store" — without it, the browser may serve a previous
    // tenant's GET /api/* response after a tenant switch because the URL
    // is identical and only the X-Tenant-ID header differs (browsers do
    // not key the HTTP cache on custom request headers).
    const response = await fetch(url, { ...options, headers, cache: "no-store" });

    // Handle transparent token refresh (backend sends X-New-Access-Token)
    const newAccessToken = response.headers.get("X-New-Access-Token");
    if (newAccessToken) {
      await setAccessToken(newAccessToken);
    }

    // Every /api/* response says which module set it was answered under. A
    // change means the super-admin switched something; the auth layer re-reads
    // the profile so the sidebar stops offering a module the school no longer
    // has — without waiting for a logout.
    noteFeatureStamp(response.headers.get("X-Feature-Stamp"));

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isNetworkFail =
      msg === "Failed to fetch" ||
      msg === "Load failed" ||
      msg.includes("NetworkError when attempting to fetch");
    const isDev = process.env.NODE_ENV === "development";
    const friendly = isNetworkFail
      ? isDev
        ? "Cannot reach the API. If you run locally, start Docker and open the app through your gateway (for example http://localhost:80) instead of only the Next.js port."
        : "We could not reach the server. Check your internet connection, wait a moment, and try again. If it keeps happening, sign out and sign back in, or contact your school administrator."
      : msg;
    throw new ApiException(friendly, 0, { originalError: msg, url });
  }
};

function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    // The backend's validation_error_response keeps `message` generic
    // ("Validation failed") and puts the specific, human-readable reason in a
    // string `details`. Prefer that so users see the actual problem. When
    // `details` is an array/object (field-level errors), fall through to message.
    if (typeof o.details === "string" && o.details.trim()) return o.details;
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (typeof o.error === "string" && o.error.trim()) return o.error;
  }
  if (typeof data === "string" && data.trim()) {
    const t = data.trim();
    if (t.startsWith("<!DOCTYPE") || t.toLowerCase().startsWith("<html"))
      return "Server returned a web page instead of JSON — check the API URL.";
    return t.length > 280 ? `${t.slice(0, 280)}…` : t;
  }
  return fallback || "An error occurred";
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let data: unknown = text;
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }

  const responseUrl = response.url || "";

  if (response.status === 401 && typeof window !== "undefined") {
    if (!isPublicAuthApiUrl(responseUrl)) {
      const { clearAuth } = await import("@/lib/storage");
      await clearAuth();
      // Only redirect if we're not already on /login — otherwise queries
      // fired by the public login page (e.g. ActiveScopeProvider's units /
      // years / setup-status pre-fetches) would trigger an infinite reload
      // loop when they 401.
      const alreadyOnLogin = window.location.pathname.startsWith("/login");
      if (!alreadyOnLogin) {
        window.location.replace("/login");
      }
      throw new ApiException(
        "Your session has expired or you are not signed in. Please log in again.",
        401,
        data
      );
    }
  }

  // Self-correct stale permissions on 403. The backend enforces fresh perms
  // per request, so a 403 can mean a logged-in user's cached permissions went
  // stale (e.g. a School Admin revoked a sub-admin's module). Ask the auth
  // layer to re-fetch the profile; the registered handler is throttled
  // (loop-guarded) and a no-op when unmounted. We exclude the /profile call
  // itself so a 403 from the refresh can't re-trigger a refresh, and the
  // public auth URLs (which never carry user perms). We do NOT log out and we
  // still throw ApiException below so per-call handling (toasts, graceful
  // states) and the RouteGuard redirect run unchanged.
  if (
    response.status === 403 &&
    typeof window !== "undefined" &&
    !isPublicAuthApiUrl(responseUrl) &&
    !responseUrl.includes("/api/auth/profile")
  ) {
    notifyForbidden();
  }

  // 413 needs its own branch: nginx rejects an oversized body with an HTML
  // error page, not our JSON envelope, so extractErrorMessage would fall back
  // to a bare status text like "Request Entity Too Large". Clients validate
  // size up front, but a proxy limit lower than the app's own can still land
  // here — say what actually happened instead of leaking the proxy's page.
  if (response.status === 413) {
    throw new ApiException(
      "The file you selected is too large to upload. Please choose a smaller file.",
      413,
      data
    );
  }

  if (data && typeof data === "object" && "success" in data) {
    const res = data as { success: boolean; data?: unknown; message?: string; error?: string };
    if (res.success) {
      const resultData =
        res.data !== undefined && res.data !== null
          ? (typeof res.data === "object" && !Array.isArray(res.data)
            ? { ...res.data, message: res.message }
            : res.data)
          : {};
      return resultData as T;
    }
    throw new ApiException(
      extractErrorMessage(data, "An error occurred"),
      response.status,
      data
    );
  }

  if (!response.ok) {
    throw new ApiException(
      extractErrorMessage(data, response.statusText),
      response.status,
      data
    );
  }

  return data as T;
};

export const apiGet = async <T>(endpoint: string): Promise<T> => {
  const response = await apiRequest(endpoint, { method: "GET" });
  return handleResponse<T>(response);
};

/** Fetch binary response (e.g. PDF) as Blob. Use for download-invoice, download-receipt. */
export const apiGetBlob = async (endpoint: string): Promise<Blob> => {
  const response = await apiRequest(endpoint, { method: "GET" }, true);
  if (!response.ok) {
    const text = await response.text();
    throw new ApiException(
      text || `Request failed (${response.status})`,
      response.status
    );
  }
  return response.blob();
};

/** Fetch a text/HTML response. Use for print-invoice, print-receipt endpoints. */
export const apiGetText = async (endpoint: string): Promise<string> => {
  const response = await apiRequest(endpoint, { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new ApiException(
      text || `Request failed (${response.status})`,
      response.status
    );
  }
  return response.text();
};

export const apiPost = async <T>(endpoint: string, body?: unknown): Promise<T> => {
  const response = await apiRequest(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
};

export const apiPostForm = async <T>(endpoint: string, formData: FormData): Promise<T> => {
  const response = await apiRequest(
    endpoint,
    { method: "POST", body: formData },
    true
  );
  return handleResponse<T>(response);
};

export const apiPut = async <T>(endpoint: string, body?: unknown): Promise<T> => {
  const response = await apiRequest(endpoint, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
};

export const apiPatch = async <T>(endpoint: string, body?: unknown): Promise<T> => {
  const response = await apiRequest(endpoint, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
};

export const apiDelete = async <T>(
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> => {
  const response = await apiRequest(endpoint, {
    method: "DELETE",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
};
