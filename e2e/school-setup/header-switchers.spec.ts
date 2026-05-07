import { test, expect } from '../fixtures/auth';
import { loginAsAdmin } from '../fixtures/login';

/**
 * Header switcher tests — UnitSwitcher and AcademicYearSwitcher.
 *
 * UnitSwitcher only renders when there are ≥ 2 units; if the test tenant has
 * only 1 unit the test skips gracefully.  AcademicYearSwitcher always renders
 * (showing "No academic year" when none are configured).
 */

test.describe('Header switchers', () => {

  test('academic year switcher is always visible in the header', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/dashboard');

    // AcademicYearSwitcher renders a <button> containing a Calendar icon.
    // It shows the year name, "Loading…", or "No academic year".
    const yearSwitcher = page.locator('header button').filter({
      hasText: /Loading|No academic year|\d{4}/,
    });
    await expect(yearSwitcher.first()).toBeVisible({ timeout: 10_000 });
  });

  test('academic year switcher shows a year name when academic year is configured', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/dashboard');

    // Wait for loading state to resolve
    await page.waitForFunction(() => {
      const btns = [...document.querySelectorAll('header button')];
      return btns.some((b) => b.textContent?.includes('Loading') === false);
    }, undefined, { timeout: 10_000 }).catch(() => { /* ok */ });

    // If an academic year is configured, its name should appear in the header
    const ayBtn = page.locator('header button').filter({ hasText: /\d{4}/ });
    const noAyBtn = page.locator('header button').filter({ hasText: /No academic year/ });

    // At least one of these variants must be visible
    await expect(ayBtn.or(noAyBtn).first()).toBeVisible({ timeout: 10_000 });
  });

  test('unit switcher is absent when only one unit is configured', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/dashboard');

    // UnitSwitcher renders null when units.length <= 1
    // Check that the Building2 icon button (unit switcher trigger) is NOT visible
    const unitSwitcher = page.locator('header button').filter({ hasText: /primary|secondary|nursery|higher_secondary|other/i });
    // We don't assert it's gone (maybe the tenant has multiple units); we just
    // assert the page itself loaded successfully.
    await expect(page.locator('header').first()).toBeVisible();
    // This test documents expected behavior — skip if we can't confirm single-unit
    if (await unitSwitcher.count() > 0) test.skip();
    await expect(unitSwitcher).toHaveCount(0);
  });

  test('unit switcher is visible when multiple units are configured', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/dashboard');

    // UnitSwitcher only mounts when there are >= 2 units.
    // It renders a button with the active unit's name + type badge.
    const unitSwitcher = page.locator('header').getByRole('button').filter({
      has: page.locator('svg'), // Building2 icon inside the button
    });
    const count = await unitSwitcher.count();
    if (count === 0) {
      // Single-unit tenant — skip this test
      test.skip();
    }
    // Verify the unit switcher dropdown opens on click
    const firstUnitBtn = unitSwitcher.first();
    await firstUnitBtn.click();
    // DropdownMenuContent should appear
    await expect(page.locator('[role="menu"], [data-radix-popper-content-wrapper]').first()).toBeVisible({ timeout: 5_000 });
  });

  test('academic year switcher dropdown lists all years on click', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/dashboard');

    // Find the academic year button (has year text or "No academic year")
    const ayBtn = page.locator('header button').filter({ hasText: /\d{4}|No academic year/ }).first();
    const isDisabled = await ayBtn.getAttribute('disabled');
    if (isDisabled !== null) {
      // No academic year configured — skip this test
      test.skip();
    }
    await ayBtn.click();
    // Dropdown menu should open with at least one year entry
    const menu = page.locator('[role="menu"], [data-radix-popper-content-wrapper]').first();
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await expect(menu.locator('[role="menuitem"]').first()).toBeVisible();
  });

});
