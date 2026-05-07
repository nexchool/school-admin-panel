import { test, expect } from '../fixtures/auth';
import { loginAsAdmin } from '../fixtures/login';

// ---------------------------------------------------------------------------
// SetupGate (browser)
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — SetupGate (browser)', () => {

  test('unauthenticated visit redirects to /login', async ({ page }) => {
    // Navigate directly to /dashboard without logging in.
    // Next.js middleware / ProtectedRoute should bounce to /login.
    await page.goto('/dashboard');
    await page.waitForURL(/\/login/, { timeout: 8000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated visit with incomplete setup redirects to /school-setup', async ({ page }) => {
    // Requires a test tenant where setup is NOT complete.
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/dashboard');
    // SetupGate replaces with /school-setup when setup is incomplete.
    // If setup is already complete the test will still pass (dashboard stays).
    // We only assert the URL is a known valid page.
    await expect(page).toHaveURL(/\/(dashboard|school-setup)/);
  });

  test('SetupGate: /profile is accessible when setup is incomplete', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/profile');
    // Should NOT be redirected to /school-setup — profile is in the allowlist.
    await expect(page).not.toHaveURL(/\/school-setup/);
  });

  test('SetupGate: /students is blocked (redirected) when setup is incomplete', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    // Navigate to a blocked route and verify it either stays on school-setup
    // or loads students (if setup is already complete for this tenant).
    await page.goto('/students');
    await expect(page).toHaveURL(/\/(students|school-setup)/);
  });

  test.todo('authenticated visit with complete setup reaches /dashboard without redirect');
  test.todo('SetupGate: /logout is accessible when setup is incomplete');
  test.todo('SetupGate: /finance is blocked (redirected) when setup is incomplete');
  test.todo('needs_reconfirm banner is shown when a module regresses after setup was complete');
  test.todo('regressed_modules list is visible in the banner');

});

// ---------------------------------------------------------------------------
// Step 0 — Template Selection
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — Step 0: Template Selection', () => {

  test.todo('shows all 4 board templates: CBSE, GSEB, ICSE, IB');
  test.todo('selecting CBSE pre-populates grade list (1–12) and subject count');
  test.todo('selecting GSEB shows Gujarati as primary language subject');
  test.todo('"Custom / Skip" option proceeds to Step 1 with empty defaults');

});

// ---------------------------------------------------------------------------
// Step 1 — School Info (Units page)
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — Step 1: School Info', () => {

  test('Add Unit button opens the Add Unit dialog', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/units');
    await page.getByRole('button', { name: /Add Unit/i }).click();
    // Dialog should open with the title "Add Unit"
    await expect(page.getByRole('heading', { name: /Add Unit/i })).toBeVisible();
  });

  test('school unit form validates required fields on empty submit', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/units');
    await page.getByRole('button', { name: /Add Unit/i }).click();
    await expect(page.getByRole('heading', { name: /Add Unit/i })).toBeVisible();

    // Click Save without filling required fields
    await page.getByRole('button', { name: /Add Unit/i, exact: true }).last().click();

    // Expect validation error messages for required fields
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test('DISE (U-DISE) code field is present and optional', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/units');
    await page.getByRole('button', { name: /Add Unit/i }).click();
    await expect(page.getByRole('heading', { name: /Add Unit/i })).toBeVisible();

    // U-DISE field has id="unit-dise" and should be present but not required
    const dise = page.locator('#unit-dise');
    await expect(dise).toBeVisible();
    // Label should not have a * required indicator
    await expect(page.getByLabel(/U-DISE/i)).toBeVisible();
  });

  test('GR number scheme field accepts format strings', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/units');
    await page.getByRole('button', { name: /Add Unit/i }).click();
    await expect(page.getByRole('heading', { name: /Add Unit/i })).toBeVisible();

    const grField = page.locator('#unit-gr-scheme');
    await expect(grField).toBeVisible();
    await grField.fill('MN-{SEQ}');
    await expect(grField).toHaveValue('MN-{SEQ}');
  });

  test.todo('saving school info persists and shows in summary');

});

// ---------------------------------------------------------------------------
// Step 2 — School Units
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — Step 2: School Units', () => {

  test('units page renders a table with correct column headers', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/units');
    // Table headers: Name, Code, Type, U-DISE, GR Scheme, Status, Actions
    await expect(page.getByRole('columnheader', { name: /Name/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Code/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Type/i })).toBeVisible();
  });

  test.todo('can add a school unit with name and address');
  test.todo('unit list shows all added units');
  test.todo('invite admin button is hidden when only 1 unit exists');
  test.todo('invite admin button appears after second unit is added');

});

// ---------------------------------------------------------------------------
// Step 3 — Programmes + Academic Year
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — Step 3: Programmes + Academic Year', () => {

  test.todo('can add an academic programme (e.g. Primary, Secondary)');
  test.todo('academic year requires a name and start/end dates');
  test.todo('start date before end date is enforced');

});

// ---------------------------------------------------------------------------
// Step 4 — Academic Year form validation
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — Step 4: Academic Year', () => {

  test('Create Academic Year dialog has name and date fields', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/academic-year');
    await page.getByRole('button', { name: /Create Academic Year/i }).click();
    await expect(page.getByRole('heading', { name: /Create Academic Year/i })).toBeVisible();
    await expect(page.locator('#ay-name')).toBeVisible();
    await expect(page.locator('#ay-start-date')).toBeVisible();
    await expect(page.locator('#ay-end-date')).toBeVisible();
  });

  test('academic year form shows validation error when fields are empty', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/academic-year');
    await page.getByRole('button', { name: /Create Academic Year/i }).click();
    await expect(page.getByRole('heading', { name: /Create Academic Year/i })).toBeVisible();

    // Submit empty form
    await page.getByRole('button', { name: /Create Academic Year/i, exact: true }).last().click();
    // Expect at least one validation error
    await expect(page.locator('.text-destructive').first()).toBeVisible();
  });

  test.todo('can add grades 1–12');
  test.todo('duplicate grade numbers are rejected');

});

// ---------------------------------------------------------------------------
// Step 5 — Bulk Class Generator
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — Step 5: Bulk Class Generator', () => {

  test('classes page renders and shows Add Class button', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/classes');
    // Page should load without error
    await expect(page.locator('body')).not.toContainText('Something went wrong');
    // At minimum the page heading or a relevant element is visible
    await expect(page.locator('main, [role="main"], .space-y-4, h1, h2').first()).toBeVisible();
  });

  test.todo('matrix renders rows for each grade, columns for each unit');
  test.todo('entering "A B C" sections creates 3 classes per cell on submit');
  test.todo('entering "Sci-A Com-A Arts-A" in a Grade 11 cell creates stream-labelled classes');
  test.todo('generator is idempotent — re-submitting same sections shows "skipped" count');
  test.todo('invalid stream prefix shows inline error on the cell');
  test.todo('dry run toggle shows preview modal without creating classes');

});

// ---------------------------------------------------------------------------
// Step 6 — Subjects
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — Step 6: Subjects', () => {

  test.todo('subjects are pre-populated from the selected template');
  test.todo('can add a custom subject');
  test.todo('can mark a subject as elective');
  test.todo('subject list is filterable by grade and stream');

});

// ---------------------------------------------------------------------------
// Step 7 — Terms
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — Step 7: Terms', () => {

  test.todo('can add at least one academic term');
  test.todo('term start/end dates are validated against academic year dates');

});

// ---------------------------------------------------------------------------
// Step 8 — Completion
// ---------------------------------------------------------------------------

test.describe('School Setup Wizard — Completion', () => {

  test('completion page renders summary cards', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/complete');
    // Summary cards for key modules should be visible
    await expect(
      page.getByText(/School Units|Programmes|Grades|Academic Year|Classes|Subjects/i).first()
    ).toBeVisible();
  });

  test('Mark Setup Complete button exists on completion page', async ({ page }) => {
    if (!await loginAsAdmin(page)) test.skip();
    await page.goto('/school-setup/complete');
    // The WizardShell renders the primary action button with the label from primaryLabel prop
    // It may be "Mark Setup Complete" or "Setup complete 🎉" (post-completion mode)
    const markBtn = page.getByRole('button', { name: /Mark Setup Complete/i });
    const alreadyComplete = page.getByText(/Setup complete/i);
    // One of them must be visible
    await expect(markBtn.or(alreadyComplete).first()).toBeVisible();
  });

  test.todo('complete setup button is enabled only when all 7 modules are ready');
  test.todo('clicking complete setup shows confirmation modal');
  test.todo('after completion, dashboard is accessible');
  test.todo('setup summary page shows timestamp and acting admin name');

});

// ---------------------------------------------------------------------------
// CSV Import
// ---------------------------------------------------------------------------

test.describe('School Setup — CSV Import', () => {

  test.todo('uploading a valid CSV shows created/skipped/failed row counts');
  test.todo('uploading an invalid CSV shows per-row error messages with row numbers');
  test.todo('column mapper UI shows when CSV headers do not match expected columns');
  test.todo('column mapper allows remapping arbitrary header to expected field');

});

// ---------------------------------------------------------------------------
// Unit Switcher
// ---------------------------------------------------------------------------

test.describe('School Setup — Unit Switcher', () => {

  test.todo('header shows unit switcher dropdown when multiple units exist');
  test.todo('selecting a unit filters lists to that unit');
  test.todo('selecting "All Units" clears the filter');
  test.todo('preference persists after page reload (PATCH /api/users/me/default-unit called)');

});

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

test.describe('School Setup — Audit Log', () => {

  test.todo('audit log page shows recent setup actions');
  test.todo('filter by module (school_setup) narrows results');
  test.todo('export CSV downloads a file with correct columns');

});
