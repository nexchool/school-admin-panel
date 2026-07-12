# Login screen redesign — design spec

- **Date:** 2026-07-09
- **Repos:** `admin-web` (primary), `server` (small branding-endpoint change)
- **Status:** Approved design, pending implementation plan

## 1. Goal & scope

Replace the current minimal centered-card login with a modern **split-screen**
default that all schools (tenants) receive, while preserving every existing
auth behavior. Add a **Forgot Password** placeholder link/route, and provide a
**per-tenant, opt-in** hook so individual schools can get a bespoke login layout
later without affecting the default for everyone else.

In scope:
- New default split-screen login layout (light theme, existing design tokens/primitives).
- Tenant customization mechanism via an opt-in `login_variant` exposed on the public branding endpoint.
- `Forgot Password?` link → placeholder `/forgot-password` page.

Out of scope:
- The actual password-reset flow (separate story). This spec only reserves the link + route.
- Dark mode.
- Building any specific school's custom layout — only the extension point is built.

## 2. Preserved behavior (must not regress)

- `react-hook-form` + Zod validation (email required/valid, password required).
- Auth via `useAuth().login()` → `POST /api/auth/login`; redirect to `/dashboard` on success.
- Multi-tenant choice screen when `requires_tenant_choice` is returned (`loginWithTenant`).
- Error alert, submit loading state ("Signing in…"), disabled-while-submitting.
- Branding fetch on mount; 404 → redirect to `/school-not-found`.
- Terms / Privacy / Contact support footer links.
- `autoComplete`, labels, keyboard/a11y.

## 3. Default layout — split-screen

Two panels inside a full-height container.

- **Brand panel** (left on `md+`; stacks on top for `< md`):
  - Solid brand-blue background (existing `--primary` family).
  - Tenant **logo**: render `logo_url` as an image when present; otherwise a school icon mark.
  - **School name** (from branding `name`, via existing `SchoolBrandName` handling/line-clamp).
  - **Welcome line**: tenant `tagline` when set, else default copy: "Welcome back. Sign in to manage your school."
  - Small "Powered by Nexchool" footnote.
- **Form panel** (right on `md+`; below brand panel on mobile):
  - "Sign in" heading + short subtext.
  - Email + Password fields (unchanged validation/`autoComplete`).
  - **Forgot Password?** link (see §5).
  - Full-width primary Sign in button with existing loading/error states.
  - Footer links (Terms · Privacy · Contact support).
- **Multi-tenant choice screen**: same layout shell, the tenant list rendered inside the form panel instead of the form.

Responsive: brand panel is decorative-but-informative; on small screens it collapses to a compact header band above the form so no content is lost.

## 4. Tenant customization via feature flag (pre-auth)

**Constraint:** the login screen is pre-auth, so the post-login
`enabled_features` array is not available. The tenant *is* known pre-auth via
branding (subdomain/`X-Tenant-ID`). Therefore the customization signal must ride
on the **public branding response**.

**Server** (`modules/auth/routes.py`, `GET /api/auth/tenant-branding`):
- Add `login_variant: string` to the response. Value read **opt-in** from the
  tenant's existing `feature_flags` JSON: `login_variant = feature_flags.get("login_variant") or "default"`.
- Add `tagline: string | null` (passthrough from the Tenant model).
- `logo_url` already present.

**Opt-in rationale (important):** the generic `is_feature_enabled(...)` helper
defaults *missing key → enabled* (opt-out). Using it here would flip **every**
school to a custom layout by default. Reading `login_variant` directly with a
`"default"` fallback makes customization strictly opt-in and preserves the
default experience for all tenants. It still uses the existing mechanism —
storage in `Tenant.feature_flags`, toggled by super-admin.

**admin-web** (`loginLayoutRegistry.ts`):
- A registry maps variant key → layout component: `{ default: DefaultLoginLayout }`.
- `resolveLoginLayout(branding)` returns the component for `branding.login_variant`,
  falling back to `DefaultLoginLayout` for unknown/unregistered keys.
- Only `default` ships now. A bespoke school later gets a component registered
  under its key and its `feature_flags.login_variant` set to that key — zero
  impact on other tenants.

**Layout/form contract:** a layout component receives `branding` and the form as
`children`. `page.tsx` composes `<Layout branding={...}><LoginForm … /></Layout>`,
where `LoginForm` owns the fields, submit, error/loading, and tenant-choice UI.
This lets custom variants restyle only the shell while reusing the shared form; a
fully bespoke variant is free to render its own form instead of the passed children.

Exposing a single non-sensitive `login_variant` string on the already-public
branding endpoint is acceptable (no auth/PII implications).

## 5. Forgot Password placeholder

- `Forgot Password?` link in the form panel → new route `/forgot-password`.
- The page renders a styled "Password reset is coming soon — contact your school
  admin or support" message with a "Back to sign in" link.
- No backend wiring now (the existing `forgotPassword` endpoint stays unused by
  this story to avoid issuing reset links that 404 before the reset page exists).

## 6. Files

**admin-web**
- `src/app/(auth)/login/page.tsx` — keep auth logic (useAuth, form, tenant-choice, branding query, redirects); delegate presentation to the resolved layout component.
- `src/components/auth/login/DefaultLoginLayout.tsx` — split-screen shell (brand panel + form slot).
- `src/components/auth/login/LoginForm.tsx` — extracted email/password form + tenant-choice UI (keeps `page.tsx` and the layout focused).
- `src/components/auth/login/loginLayoutRegistry.ts` — variant registry + `resolveLoginLayout`.
- `src/app/(auth)/forgot-password/page.tsx` — placeholder page.
- `src/services/authService.ts` — extend branding response type with `login_variant`, `tagline` (and confirm `logo_url`).

**server**
- `modules/auth/routes.py` — extend the tenant-branding response with `login_variant` (opt-in from `feature_flags`) and `tagline`.

## 7. Testing

**admin-web**
- Unit: `resolveLoginLayout` — returns default for `"default"`, for unknown keys, and for missing `login_variant`; returns a registered component when one exists.
- Component: default layout renders school name + logo (and icon fallback when `logo_url` absent); form submits through `useAuth().login`; error + loading states show.
- `/forgot-password` renders the placeholder and the back link.

**server**
- Branding endpoint returns `login_variant: "default"` when the flag is unset, and the stored value when set.
- `tagline` and `logo_url` pass through (and are null-safe when absent).

## 8. Rollout / branching

- admin-web work on `feature/login-redesign`; server work on a separate branch (e.g. `feature/branding-login-variant`).
- User reviews/merges PRs (per established workflow).
