import { test, expect } from '../fixtures/auth';

test.describe('School Setup Wizard — SetupGate (browser)', () => {

  test.todo('unauthenticated visit redirects to /login');

  test.todo('authenticated visit with incomplete setup redirects to /school-setup');

  test.todo('authenticated visit with complete setup reaches /dashboard without redirect');

  test.todo('SetupGate: /profile is accessible when setup is incomplete');
  test.todo('SetupGate: /logout is accessible when setup is incomplete');
  test.todo('SetupGate: /students is blocked (redirected) when setup is incomplete');
  test.todo('SetupGate: /finance is blocked (redirected) when setup is incomplete');

  test.todo('needs_reconfirm banner is shown when a module regresses after setup was complete');
  test.todo('regressed_modules list is visible in the banner');

});

test.describe('School Setup Wizard — Step 0: Template Selection', () => {

  test.todo('shows all 4 board templates: CBSE, GSEB, ICSE, IB');
  test.todo('selecting CBSE pre-populates grade list (1–12) and subject count');
  test.todo('selecting GSEB shows Gujarati as primary language subject');
  test.todo('"Custom / Skip" option proceeds to Step 1 with empty defaults');

});

test.describe('School Setup Wizard — Step 1: School Info', () => {

  test.todo('school name and address fields are required');
  test.todo('DISE (U-DISE) code field is optional');
  test.todo('GR number scheme field accepts format strings like "MN-{SEQ}"');
  test.todo('saving school info persists and shows in summary');

});

test.describe('School Setup Wizard — Step 2: School Units', () => {

  test.todo('can add a school unit with name and address');
  test.todo('unit list shows all added units');
  test.todo('invite admin button is hidden when only 1 unit exists');
  test.todo('invite admin button appears after second unit is added');

});

test.describe('School Setup Wizard — Step 3: Programmes + Academic Year', () => {

  test.todo('can add an academic programme (e.g. Primary, Secondary)');
  test.todo('academic year requires a name and start/end dates');
  test.todo('start date before end date is enforced');

});

test.describe('School Setup Wizard — Step 4: Grades', () => {

  test.todo('can add grades 1–12');
  test.todo('duplicate grade numbers are rejected');

});

test.describe('School Setup Wizard — Step 5: Bulk Class Generator', () => {

  test.todo('matrix renders rows for each grade, columns for each unit');
  test.todo('entering "A B C" sections creates 3 classes per cell on submit');
  test.todo('entering "Sci-A Com-A Arts-A" in a Grade 11 cell creates stream-labelled classes');
  test.todo('generator is idempotent — re-submitting same sections shows "skipped" count');
  test.todo('invalid stream prefix shows inline error on the cell');
  test.todo('dry run toggle shows preview modal without creating classes');

});

test.describe('School Setup Wizard — Step 6: Subjects', () => {

  test.todo('subjects are pre-populated from the selected template');
  test.todo('can add a custom subject');
  test.todo('can mark a subject as elective');
  test.todo('subject list is filterable by grade and stream');

});

test.describe('School Setup Wizard — Step 7: Terms', () => {

  test.todo('can add at least one academic term');
  test.todo('term start/end dates are validated against academic year dates');

});

test.describe('School Setup Wizard — Completion', () => {

  test.todo('complete setup button is enabled only when all 7 modules are ready');
  test.todo('clicking complete setup shows confirmation modal');
  test.todo('after completion, dashboard is accessible');
  test.todo('setup summary page shows timestamp and acting admin name');

});

test.describe('School Setup — CSV Import', () => {

  test.todo('uploading a valid CSV shows created/skipped/failed row counts');
  test.todo('uploading an invalid CSV shows per-row error messages with row numbers');
  test.todo('column mapper UI shows when CSV headers do not match expected columns');
  test.todo('column mapper allows remapping arbitrary header to expected field');

});

test.describe('School Setup — Unit Switcher', () => {

  test.todo('header shows unit switcher dropdown when multiple units exist');
  test.todo('selecting a unit filters lists to that unit');
  test.todo('selecting "All Units" clears the filter');
  test.todo('preference persists after page reload (PATCH /api/users/me/default-unit called)');

});

test.describe('School Setup — Audit Log', () => {

  test.todo('audit log page shows recent setup actions');
  test.todo('filter by module (school_setup) narrows results');
  test.todo('export CSV downloads a file with correct columns');

});
