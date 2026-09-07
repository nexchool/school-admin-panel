import { beforeEach, describe, expect, it, vi } from "vitest";

const getRefreshToken = vi.fn();
const getTenantId = vi.fn();
const setAccessToken = vi.fn().mockResolvedValue(undefined);
const setRefreshToken = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/storage", () => ({
  getRefreshToken: () => getRefreshToken(),
  getTenantId: () => getTenantId(),
  setAccessToken: (token: string) => setAccessToken(token),
  setRefreshToken: (token: string) => setRefreshToken(token),
}));

vi.mock("@/lib/constants", () => ({
  getApiUrl: (path: string) => `http://api.test${path}`,
}));

/** Import fresh each time: the module holds the in-flight promise. */
async function loadModule() {
  vi.resetModules();
  return import("./sessionRefresh");
}

function respondOnce(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 401,
    json: async () => body,
  });
}

const RENEWED = {
  data: { access_token: "access-2", refresh_token: "refresh-2" },
};

describe("refreshSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRefreshToken.mockResolvedValue("refresh-1");
    getTenantId.mockResolvedValue("tenant-1");
  });

  it("stores both new tokens, not only the access token", async () => {
    // Dropping the replacement would leave the next renewal presenting a
    // token the server has already seen spent — which it reads as theft.
    vi.stubGlobal("fetch", respondOnce(RENEWED));
    const { refreshSession } = await loadModule();

    await expect(refreshSession()).resolves.toBe(true);

    expect(setAccessToken).toHaveBeenCalledWith("access-2");
    expect(setRefreshToken).toHaveBeenCalledWith("refresh-2");
  });

  it("spends the refresh token once when several callers ask at once", async () => {
    // The whole reason this module exists: a dashboard's parallel requests
    // all 401 together, and a refresh token may be spent once.
    const fetchMock = respondOnce(RENEWED);
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await loadModule();

    const outcomes = await Promise.all([
      refreshSession(),
      refreshSession(),
      refreshSession(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual([true, true, true]);
  });

  it("allows a later renewal after the first one finishes", async () => {
    const fetchMock = respondOnce(RENEWED);
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await loadModule();

    await refreshSession();
    await refreshSession();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("sends the refresh token in the body, never in a header", async () => {
    const fetchMock = respondOnce(RENEWED);
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await loadModule();

    await refreshSession();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(JSON.parse(init.body as string)).toEqual({
      refresh_token: "refresh-1",
    });
    expect(Object.keys(headers)).not.toContain("X-Refresh-Token");
    expect(headers["X-Tenant-ID"]).toBe("tenant-1");
  });

  it("reports failure when the server refuses, and stores nothing", async () => {
    vi.stubGlobal("fetch", respondOnce({}, false));
    const { refreshSession } = await loadModule();

    await expect(refreshSession()).resolves.toBe(false);
    expect(setAccessToken).not.toHaveBeenCalled();
    expect(setRefreshToken).not.toHaveBeenCalled();
  });

  it("reports failure rather than throwing when the network is down", async () => {
    // A dropped connection is not an expired session; the caller retries.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { refreshSession } = await loadModule();

    await expect(refreshSession()).resolves.toBe(false);
  });

  it("does not call the server when there is no refresh token", async () => {
    getRefreshToken.mockResolvedValue(null);
    const fetchMock = respondOnce(RENEWED);
    vi.stubGlobal("fetch", fetchMock);
    const { refreshSession } = await loadModule();

    await expect(refreshSession()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a reply missing either token as a failure", async () => {
    // Half a pair is not a renewal: storing the access token alone would
    // leave the old refresh token in place and already spent.
    vi.stubGlobal(
      "fetch",
      respondOnce({ data: { access_token: "access-2" } }),
    );
    const { refreshSession } = await loadModule();

    await expect(refreshSession()).resolves.toBe(false);
    expect(setAccessToken).not.toHaveBeenCalled();
  });
});
