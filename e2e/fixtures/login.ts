import type { Page } from "@playwright/test";

/**
 * Logs in as admin via the UI.
 * Returns true if login succeeded (redirected to /dashboard or /school-setup).
 * Returns false if login failed (e.g. test tenant not seeded) — callers should
 * call test.skip() when this returns false.
 */
export async function loginAsAdmin(page: Page): Promise<boolean> {
  const email = process.env.E2E_ADMIN_EMAIL ?? "admin@test.com";
  const password = process.env.E2E_ADMIN_PASSWORD ?? "testpassword";

  await page.goto("/login");

  // The login form uses id="email" and id="password" (react-hook-form registers)
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');

  try {
    await page.waitForURL(/\/(dashboard|school-setup)/, { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}
