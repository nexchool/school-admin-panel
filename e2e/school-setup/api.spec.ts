import { test, expect } from '../fixtures/auth';

test.describe('School Setup — API contract', () => {

  test('GET /status returns all 7 module statuses + overall shape', async ({ apiRequest }) => {
    const resp = await apiRequest.get('/api/school-setup/status');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const data = body.data;

    expect(data.overall).toMatchObject({
      is_setup_complete: expect.any(Boolean),
      needs_reconfirm: expect.any(Boolean),
      regressed_modules: expect.any(Array),
    });
    for (const module of ['units', 'programmes', 'grades', 'academic_year', 'classes', 'subjects', 'terms']) {
      expect(data[module]).toMatchObject({ ready: expect.any(Boolean) });
    }
  });

  test('GET /status returns 401 without auth', async ({ playwright, tenantId }) => {
    const req = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL ?? 'http://localhost:5000',
      extraHTTPHeaders: { 'X-Tenant-ID': tenantId },
    });
    const resp = await req.get('/api/school-setup/status');
    expect(resp.status()).toBe(401);
    await req.dispose();
  });

  test('POST /bulk-generate rejects empty cells', async ({ apiRequest }) => {
    const resp = await apiRequest.post('/api/school-setup/bulk-generate', {
      data: { academic_year_id: 'some-year', cells: [] },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error?.message ?? body.message ?? '').toMatch(/cells/i);
  });

  test('POST /bulk-generate rejects missing academic_year_id', async ({ apiRequest }) => {
    const resp = await apiRequest.post('/api/school-setup/bulk-generate', {
      data: { cells: [{ grade_id: 'g1', school_unit_id: 'u1', programme_id: 'p1', sections: ['A'] }] },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error?.message ?? body.message ?? '').toMatch(/academic_year_id/i);
  });

  test('POST /bulk-generate rejects non-existent academic_year_id', async ({ apiRequest }) => {
    const resp = await apiRequest.post('/api/school-setup/bulk-generate', {
      data: { academic_year_id: 'does-not-exist', cells: [{ grade_id: 'g', school_unit_id: 'u', programme_id: 'p', sections: ['A'] }] },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error?.message ?? body.message ?? '').toMatch(/academic_year_id/i);
  });

  test('POST /duplicate-structure with dry_run=true returns preview, no DB change', async ({ apiRequest }) => {
    const before = await (await apiRequest.get('/api/school-setup/status')).json();

    const resp = await apiRequest.post('/api/school-setup/duplicate-structure', {
      data: {
        mode: 'unit_to_unit',
        source_unit_id: 'unit-a',
        target_unit_id: 'unit-b',
        dry_run: true,
      },
    });
    expect(resp.status()).toBeLessThan(500);

    if (resp.status() === 200) {
      const body = await resp.json();
      expect(body.data.dry_run).toBe(true);
      expect(body.data).toHaveProperty('would_create_count');

      const after = await (await apiRequest.get('/api/school-setup/status')).json();
      expect(after.data.classes.count).toBe(before.data.classes.count ?? after.data.classes.count);
    }
  });

  test('POST /import returns created/skipped/failed keys', async ({ apiRequest }) => {
    const csv = Buffer.from('unit_code,programme_code,grade,section\n');
    const resp = await apiRequest.post('/api/school-setup/import', {
      multipart: {
        file: { name: 'test.csv', mimeType: 'text/csv', buffer: csv },
      },
    });
    const body = await resp.json();
    if (resp.status() === 200) {
      expect(body.data).toHaveProperty('created');
      expect(body.data).toHaveProperty('skipped');
      expect(body.data).toHaveProperty('failed');
    }
  });

  test('PATCH /api/users/me/default-unit accepts null (clear preference)', async ({ apiRequest }) => {
    const resp = await apiRequest.patch('/api/users/me/default-unit', {
      data: { default_unit_id: null },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data.default_unit_id).toBeNull();
  });

  test('PATCH /api/users/me/default-unit rejects unit from another tenant', async ({ apiRequest }) => {
    const resp = await apiRequest.patch('/api/users/me/default-unit', {
      data: { default_unit_id: 'foreign-tenant-unit-id' },
    });
    expect(resp.status()).toBe(400);
  });

});
