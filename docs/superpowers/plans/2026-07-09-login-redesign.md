# Login Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal centered-card login with a modern split-screen default for all tenants, add a Forgot Password placeholder, and provide an opt-in per-tenant custom-layout hook via the public branding endpoint.

**Architecture:** admin-web `login/page.tsx` keeps auth logic and resolves a layout component from `branding.login_variant` (default → `DefaultLoginLayout`, a split-screen shell wrapping a shared `LoginForm`). The public server branding endpoint gains an opt-in `login_variant` (default `"default"`) + `tagline`. A `/forgot-password` placeholder route is added.

**Tech Stack:** Next.js 16 (App Router), React, react-hook-form + Zod, Tailwind 4, TanStack Query; Flask backend.

Spec: `docs/superpowers/specs/2026-07-09-login-redesign-design.md`

---

### Task 1: Server — consolidate + enrich branding endpoint

**Files:**
- Modify: `server/modules/auth/routes.py` (enrich `tenant_branding` ~line 153; delete dead `get_tenant_branding` ~line 733)
- Test: `server/tests/auth/test_tenant_branding.py` (create)

Serving endpoint confirmed as `auth.tenant_branding`; `auth.get_tenant_branding` is a dead duplicate.

- [ ] **Step 1:** Write test asserting the branding response includes `login_variant` (default `"default"` when unset, stored value when set) and `tagline`.
- [ ] **Step 2:** Run it; expect FAIL (keys missing).
- [ ] **Step 3:** Enrich the live endpoint:

```python
    tenant = g.tenant
    flags = tenant.feature_flags or {}
    # Opt-in: default to "default" so unset tenants keep the standard login.
    # NOT is_feature_enabled() — that defaults missing->enabled, which would
    # flip every school to a custom layout.
    login_variant = flags.get('login_variant') or 'default'
    return success_response(data={
        'name': tenant.name,
        'subdomain': tenant.subdomain,
        'logo_url': tenant.logo_url,
        'tagline': getattr(tenant, 'tagline', None),
        'login_variant': login_variant,
    })
```

Delete the dead `get_tenant_branding` function (the whole `@auth_bp.route('/tenant-branding', ...)` block at ~733).

- [ ] **Step 4:** Run branding test + `python -c "import app"`; expect PASS/clean.
- [ ] **Step 5:** Commit (server branch `feature/branding-login-variant`).

### Task 2: admin-web — extend branding type/service

**Files:** Modify `admin-web/src/services/authService.ts`

- [ ] Define and export a `TenantBranding` type and use it:

```ts
export interface TenantBranding {
  name: string;
  subdomain?: string;
  logo_url?: string | null;
  tagline?: string | null;
  login_variant?: string;
}

export const getTenantBranding = () =>
  apiGet<TenantBranding>(API_ENDPOINTS.TENANT_BRANDING);
```

Keep `getTenantBrandingSafe` working (it destructures `name`).

- [ ] Commit.

### Task 3: admin-web — login layout registry

**Files:**
- Create: `admin-web/src/components/auth/login/loginLayoutRegistry.ts`
- Test: `admin-web/src/components/auth/login/loginLayoutRegistry.test.ts`

- [ ] **Step 1:** Test `resolveLoginLayout` → returns `DefaultLoginLayout` for `"default"`, unknown key, and `undefined`.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement:

```ts
import type { ComponentType } from "react";
import type { LoginLayoutProps } from "./DefaultLoginLayout";
import { DefaultLoginLayout } from "./DefaultLoginLayout";

const REGISTRY: Record<string, ComponentType<LoginLayoutProps>> = {
  default: DefaultLoginLayout,
};

export function resolveLoginLayout(variant?: string): ComponentType<LoginLayoutProps> {
  return (variant && REGISTRY[variant]) || DefaultLoginLayout;
}
```

- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5:** Commit.

### Task 4: admin-web — LoginForm component

**Files:** Create `admin-web/src/components/auth/login/LoginForm.tsx`

Extract the email/password form + tenant-choice UI + Forgot Password link from `page.tsx`. Owns: `useForm`, `onSubmit` calling `useAuth().login`, error/loading, tenant-choice list, footer links, and the `Forgot Password?` link (`next/link` → `/forgot-password`). Props: none required beyond internal hooks (uses `useAuth`, `useRouter`). Keeps the existing validation schema.

- [ ] Implement `LoginForm` moving lines 30-35, 39-112, 131-198 logic; add:

```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="password">Password</Label>
  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
    Forgot password?
  </Link>
</div>
```

- [ ] Commit.

### Task 5: admin-web — DefaultLoginLayout (split-screen)

**Files:** Create `admin-web/src/components/auth/login/DefaultLoginLayout.tsx`

- [ ] Implement the split-screen shell:

```tsx
export interface LoginLayoutProps {
  branding: TenantBranding | null;
  children: React.ReactNode; // the form panel content
}
```

Left brand panel (`hidden md:flex` on desktop; a compact header band `md:hidden` on mobile) with `logo_url` image or a school icon fallback, `SchoolBrandName`, welcome line (`branding.tagline` || default copy), "Powered by Nexchool". Right panel renders `children` centered with `max-w-md`. Brand-blue via `bg-primary text-primary-foreground`.

- [ ] Commit.

### Task 6: admin-web — compose in page.tsx

**Files:** Modify `admin-web/src/app/(auth)/login/page.tsx`

- [ ] Keep branding query + school-not-found redirect. Resolve layout and render:

```tsx
const Layout = resolveLoginLayout(brandingData?.login_variant);
return (
  <Layout branding={brandingData ?? null}>
    <LoginForm />
  </Layout>
);
```

Remove the old inline Card markup (now in LoginForm/Layout). Tenant-choice screen lives in LoginForm.

- [ ] Commit.

### Task 7: admin-web — Forgot Password placeholder

**Files:** Create `admin-web/src/app/(auth)/forgot-password/page.tsx`

- [ ] Styled placeholder: heading "Password reset is coming soon", body "This feature isn't available yet — contact your school admin or support to reset your password.", and a `Link href="/login"` "Back to sign in". Reuse the same shell feel (centered card).
- [ ] Commit.

### Task 8: Verify

- [ ] `cd admin-web && npx tsc --noEmit` → clean.
- [ ] `cd admin-web && npm run build` → success; `/login` + `/forgot-password` routes present.
- [ ] `cd admin-web && npm test -- loginLayoutRegistry` → pass.
- [ ] `cd server && python -m pytest tests/auth/test_tenant_branding.py -q && python -c "import app"` → pass/clean.
- [ ] Push both branches; open draft PRs.
```

## Self-review notes
- Spec §2 preserved behavior: LoginForm retains validation, login(), tenant-choice, error/loading, footer; page.tsx retains branding query + school-not-found redirect. ✔
- §3 layout, §4 flag (opt-in), §5 forgot-password, §6 files, §7 testing all mapped to tasks. ✔
- Type consistency: `TenantBranding` (Task 2) used in Task 3/5/6; `LoginLayoutProps` defined in Task 5, imported in Task 3. ✔
