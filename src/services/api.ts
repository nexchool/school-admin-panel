import { getApiUrl } from "@/lib/constants";
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
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle transparent token refresh (backend sends X-New-Access-Token)
    const newAccessToken = response.headers.get("X-New-Access-Token");
    if (newAccessToken) {
      await setAccessToken(newAccessToken);
    }

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Network error";
    throw new ApiException(`Cannot connect to server. ${msg}`, 0, { originalError: msg, url });
  }
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  const isJson = response.headers
    .get("content-type")
    ?.includes("application/json");

  let data: unknown;
  try {
    data = isJson ? await response.json() : await response.text();
  } catch {
    throw new ApiException("Failed to parse response", response.status);
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
      res.message || (res.error as string) || "An error occurred",
      response.status,
      data
    );
  }

  if (!response.ok) {
    const err = data as { message?: string; error?: string };
    throw new ApiException(
      err?.message || err?.error || "An error occurred",
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
  const response = await apiRequest(endpoint, { method: "GET" });
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
