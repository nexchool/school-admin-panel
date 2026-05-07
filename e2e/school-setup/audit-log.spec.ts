import { test, expect } from '../fixtures/auth';
import { loginAsAdmin } from '../fixtures/login';

/**
 * Audit Log page — browser tests.
 *
 * These tests require the test tenant to have at least one user with the
 * "audit_log.view" permission (typically the super-admin used for e2e).
 * If the login fails or the permission is missing the test gracefully skips.
 */

test.describe('Audit Log page', () => {

  test('admin can navigate to and view the audit log page', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/audit-log');
    // Page should render without a hard error
    await expect(page.locator('body')).not.toContainText('Something went wrong', { timeout: 10_000 });
    // The main heading "Audit Log" must be present
    await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible({ timeout: 10_000 });
  });

  test('filters bar renders date inputs and module/action fields', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/audit-log');
    await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible({ timeout: 10_000 });

    // From / To date inputs
    await expect(page.locator('#date-from')).toBeVisible();
    await expect(page.locator('#date-to')).toBeVisible();

    // Module and Action filter inputs
    await expect(page.locator('#module-input')).toBeVisible();
    await expect(page.locator('#action-input')).toBeVisible();
  });

  test('Apply Filters and Reset buttons are present', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/audit-log');
    await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole('button', { name: /Apply Filters/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reset/i })).toBeVisible();
  });

  test('Export to Excel button is present', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/audit-log');
    await expect(page.getByRole('heading', { name: /Audit Log/i })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole('button', { name: /Export to Excel/i })).toBeVisible();
  });

  test('access denied card is shown when user lacks audit_log.view permission', async ({ page }) => {
    // This test verifies the ForbiddenCard component renders correctly.
    // We can only run it if we have a non-admin account; skip if not configured.
    const lowPrivEmail = process.env.E2E_LOW_PRIV_EMAIL;
    const lowPrivPassword = process.env.E2E_LOW_PRIV_PASSWORD;
    if (!lowPrivEmail || !lowPrivPassword) test.skip();

    await page.goto('/login');
    await page.fill('#email', lowPrivEmail);
    await page.fill('#password', lowPrivPassword);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/\/(dashboard|school-setup)/, { timeout: 8000 });
    } catch {
      test.skip();
    }

    await page.goto('/audit-log');
    await expect(page.getByRole('heading', { name: /Access Denied/i })).toBeVisible({ timeout: 10_000 });
  });

});
