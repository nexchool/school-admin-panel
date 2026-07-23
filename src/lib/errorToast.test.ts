import { describe, it, expect, vi, beforeEach } from "vitest";

// notify → sonner. Mock sonner so we can inspect what reaches the toast layer.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { toast } from "sonner";
import { friendlyErrorMessage, toastError, toastSuccess } from "@/lib/errorToast";

const mockToast = vi.mocked(toast);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("friendlyErrorMessage", () => {
  it("rewrites a known DB error to friendly copy", () => {
    const msg = friendlyErrorMessage(new Error("duplicate key value violates …"));
    expect(msg).toBe("That entry already exists. Please use unique values.");
  });

  it("returns the fallback when the error carries no message", () => {
    expect(friendlyErrorMessage(null, "Couldn't save")).toBe("Couldn't save");
  });

  it("hides technical stack/driver text behind the fallback", () => {
    const raw = "psycopg2.errors.SomethingWeird: boom at line 47";
    expect(friendlyErrorMessage(raw, "Couldn't save")).toBe(
      "Couldn't save",
    );
  });

  it("passes a plain, non-technical message through", () => {
    expect(friendlyErrorMessage(new Error("Class is full"))).toBe("Class is full");
  });
});

describe("toastError", () => {
  it("keeps the fallback as the title and shows the friendly reason as description", () => {
    toastError(new Error("duplicate key value"), "Couldn't add the student");
    expect(mockToast.error).toHaveBeenCalledTimes(1);
    const [title, opts] = mockToast.error.mock.calls[0];
    expect(title).toBe("Couldn't add the student");
    expect(opts?.description).toBe(
      "That entry already exists. Please use unique values.",
    );
  });

  it("shows a single line (no description) when there is no distinct reason", () => {
    toastError(null, "Couldn't add the student");
    const [title, opts] = mockToast.error.mock.calls[0];
    expect(title).toBe("Couldn't add the student");
    expect(opts?.description).toBeUndefined();
  });

  it("attaches a Retry action that runs the callback", () => {
    const onRetry = vi.fn();
    toastError(new Error("network error"), "Couldn't save", { onRetry });
    const [, opts] = mockToast.error.mock.calls[0];
    expect(opts?.action).toMatchObject({ label: "Retry" });
    (opts!.action as unknown as { onClick: () => void }).onClick();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the action when no retry is given", () => {
    toastError(new Error("boom"), "Couldn't save");
    const [, opts] = mockToast.error.mock.calls[0];
    expect(opts?.action).toBeUndefined();
  });
});

describe("toastSuccess", () => {
  it("forwards title and description to the toast layer", () => {
    toastSuccess("Student added", { description: "Aarav is now in 7-B." });
    expect(mockToast.success).toHaveBeenCalledTimes(1);
    const [title, opts] = mockToast.success.mock.calls[0];
    expect(title).toBe("Student added");
    expect(opts?.description).toBe("Aarav is now in 7-B.");
  });
});
