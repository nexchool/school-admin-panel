/**
 * Shared Playwright fixtures providing:
 *   - apiRequest: an APIRequestContext authenticated against the Flask API
 *   - authToken: raw JWT for manual header injection
 *
 * Env vars (set in .env.e2e.local):
 *   E2E_API_URL         default http://localhost:5000
 *   E2E_BASE_URL        default http://localhost:3000
 *   E2E_TENANT_ID       tenant used for all e2e tests
 *   E2E_ADMIN_EMAIL     admin login for test tenant
 *   E2E_ADMIN_PASSWORD  admin password
 */

import { test as base, APIRequestContext } from '@playwright/test';

type AuthFixtures = {
  tenantId: string;
  authToken: string;
  apiRequest: APIRequestContext;
};

const _test = base.extend<AuthFixtures>({
  tenantId: async ({}, use) => {
    await use(process.env.E2E_TENANT_ID ?? 'test-tenant-id');
  },

  authToken: async ({ playwright, tenantId }, use) => {
    const req = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL ?? 'http://localhost:5000',
    });
    const resp = await req.post('/api/auth/login', {
      data: {
        email: process.env.E2E_ADMIN_EMAIL ?? 'admin@test.com',
        password: process.env.E2E_ADMIN_PASSWORD ?? 'testpassword',
      },
      headers: { 'X-Tenant-ID': tenantId, 'Content-Type': 'application/json' },
    });
    let token = '';
    try {
      const body = await resp.json();
      token = body?.data?.access_token ?? body?.access_token ?? '';
    } catch {
      // login may have failed if test tenant isn't set up; fixture-dependent tests will skip
    }
    await req.dispose();
    await use(token);
  },

  apiRequest: async ({ playwright, authToken, tenantId }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.E2E_API_URL ?? 'http://localhost:5000',
      extraHTTPHeaders: {
        Authorization: `Bearer ${authToken}`,
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json',
      },
    });
    await use(ctx);
    await ctx.dispose();
  },
});

/**
 * test.todo is not available in Playwright v1.59+.
 * We polyfill it as test.skip(title, body) so wizard.spec.ts placeholder
 * tests are collected and shown as skipped in the reporter.
 */
export const test = Object.assign(_test, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  todo: (title: string) => _test.skip(title, async () => {}),
}) as typeof _test & { todo: (title: string) => void };

export { expect } from '@playwright/test';
