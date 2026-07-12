# Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) tracking. TDD, frequent commits.

**Goal:** Ship complete normal + force password reset for admin-web (server + admin-web). Mobile UI later.

**Architecture:** Backend reset endpoints exist; fix the reset link to target admin-web, add strength + rate limits, add an authenticated force-reset endpoint, and wire `force_password_reset` on sub-admin creation + login/profile. admin-web gains functional forgot + reset pages, a forced set-password screen, and services/types.

**Tech Stack:** Flask/SQLAlchemy/pytest; Next.js App Router, RHF+Zod, TanStack Query, vitest.

Spec: `docs/superpowers/specs/2026-07-12-password-reset-design.md`. Branches: `feature/password-reset` (both repos).

---

## Phase A — Server (`server/`)

### Task S1: Web-facing reset URL + platform branch
**Files:** `server/config/settings.py` (add helper near `get_reset_password_url` ~:212), `server/modules/auth/routes.py` (`forgot_password` ~:604), test `server/tests/auth/test_password_reset_flow.py` (create).
- [ ] Test: calling `forgot_password` with `{email, platform:"web"}` for a tenant with subdomain `mts` dispatches a notification whose `extra_data["reset_url"]` starts with `http://mts.localhost:3000/reset-password?` and contains `token=` + `email=`. (Mock `notification_dispatcher.dispatch` to capture kwargs; user must exist.)
- [ ] Implement `get_admin_web_reset_url(token, email, subdomain)` in settings: read env `ADMIN_WEB_BASE_URL` (default `http://localhost:3000`); split scheme/host; host = `f"{subdomain}.{host}"` when subdomain; return `<scheme>://<host>/reset-password?` + urlencoded `token`,`email`.
- [ ] In `forgot_password`: read `platform = (data or {}).get("platform")`; if `platform == "web"` use the web helper with `g.tenant.subdomain`, else keep the existing mobile `get_reset_password_url`. Keep enumeration-safe 200.
- [ ] Run tests; commit.

### Task S2: Strength check + rate limits on reset/forgot
**Files:** `server/modules/auth/routes.py` (`reset_password` ~:658, `forgot_password` ~:604), same test file.
- [ ] Test: `reset` with a valid token but weak password (`"short"`) → 422; with strong (`"Password1"`) → 200 and `check_password` passes; invalid token → 400; expired token (set `reset_password_sent_at` to 31 min ago) → 400.
- [ ] Implement: in `reset_password`, after token validation, reject weak via `services._is_password_strong(new_password)` → 422 (reuse existing helper/import). Add `@limiter.limit("5 per minute")` to both `forgot_password` and `reset_password`.
- [ ] Run tests; commit.

### Task S3: Authenticated force-reset endpoint
**Files:** `server/modules/auth/routes.py` (new route), same test file.
- [ ] Test: authed `POST /api/auth/password/force-reset` `{new_password:"Password1"}` → 200, user password updated, `force_password_reset` now False, current session still valid; weak → 422; no auth → 401.
- [ ] Implement `POST /api/auth/password/force-reset` `@auth_required` `@limiter.limit("5 per minute")`: validate `new_password` present + strong (422); `user = g.current_user`; `user.set_password(...)`; `user.force_password_reset = False`; save; revoke OTHER sessions (keep current) mirroring `services.change_password`'s revoke path; return 200 `{message}`.
- [ ] Run tests; commit.

### Task S4: Set force flag on sub-admin create/reset + surface in login/profile
**Files:** `server/modules/sub_admins/services.py` (`create_sub_admin` ~:445, `reset_sub_admin_password` ~:671), `server/modules/auth/routes.py` (login payload ~:428, profile ~:789), tests in `server/tests/auth/test_password_reset_flow.py` + possibly `server/tests/` sub-admin test.
- [ ] Test: after `create_sub_admin`, the created user has `force_password_reset is True`; logging in as that user returns `force_password_reset: true` in the payload; after force-reset it's false; profile echoes the flag.
- [ ] Implement: in `create_sub_admin` set `user.force_password_reset = True` before commit; same in `reset_sub_admin_password`. Add `'force_password_reset': bool(user.force_password_reset)` to the login success `data` (~:428) and the profile response (~:789).
- [ ] Run tests; commit.

## Phase B — admin-web (`admin-web/`)

### Task W1: Services, constants, types
**Files:** `admin-web/src/lib/constants.ts` (~:46), `admin-web/src/services/authService.ts`.
- [ ] Add `FORCE_RESET_PASSWORD: "/api/auth/password/force-reset"` to `API_ENDPOINTS` (RESET_PASSWORD already exists).
- [ ] `authService.ts`: `forgotPassword` sends `{ email, platform: "web" }`. Add `resetPassword({ email, token, new_password })` → POST `RESET_PASSWORD`. Add `forceResetPassword({ new_password })` → POST `FORCE_RESET_PASSWORD`. Add `force_password_reset?: boolean` to `LoginResponse` (~:10) and `ProfileResponse` (~:74).
- [ ] Commit.

### Task W2: Functional forgot-password page
**Files:** `admin-web/src/app/(auth)/forgot-password/page.tsx` (replace stub), test `admin-web/src/app/(auth)/forgot-password/page.test.tsx` (optional).
- [ ] Replace the "coming soon" stub with a client form: email (RHF+Zod), submit → `forgotPassword({email})`, then a success panel ("If an account exists for that email, a reset link is on its way"). Keep the existing centered-card styling + "Back to sign in". Loading + error states.
- [ ] Commit.

### Task W3: Reset-password page
**Files:** `admin-web/src/app/(auth)/reset-password/page.tsx` (new), test `reset-password.test` (validation).
- [ ] New client page: read `token`, `email` from `useSearchParams`. Form: new password + confirm (Zod: min 8, ≥1 digit, match). Submit → `resetPassword({email, token, new_password})`. Success → `router.replace("/login?reset=1")`. On API error (invalid/expired), show message + link to `/forgot-password`. If `token`/`email` missing, show an invalid-link state. Reuse centered-card styling.
- [ ] Optional: show a success banner on `/login` when `?reset=1` (LoginForm reads the param) — small, keep minimal.
- [ ] Commit.

### Task W4: Force-reset gating + set-password screen
**Files:** `admin-web/src/components/providers/AuthProvider.tsx` (~:133 login success, context value ~:112/372), `admin-web/src/app/(auth)/set-password/page.tsx` (new), `admin-web/src/components/layout/RouteGuard.tsx`.
- [ ] AuthProvider: store `forcePasswordReset` (from login response + profile refresh) in context; expose via `useAuth`. After a successful login, if `force_password_reset` → `router.replace("/set-password")` instead of `/dashboard`.
- [ ] `/set-password/page.tsx` (authenticated): "Set your password" form (new + confirm, same Zod rules) → `forceResetPassword({new_password})` → on success refresh profile/clear flag → `router.replace("/dashboard")`. No skip.
- [ ] RouteGuard: while `forcePasswordReset` is true, redirect dashboard routes to `/set-password` (mirror the existing `is_setup_complete` gate; allow `/set-password` itself).
- [ ] Commit.

### Task W5: Verify + PRs
- [ ] `cd admin-web && npx tsc --noEmit` clean; `npm run build` green (`/reset-password`, `/set-password` present).
- [ ] `cd server && python -m pytest tests/auth/test_password_reset_flow.py -q` green; `python -c "import app"` clean.
- [ ] Dogfood in dev: forgot → (capture link/token) → reset → login; and force path: create/mark a sub-admin, login → forced set-password → dashboard. Screenshot key screens.
- [ ] Push both branches; open PRs (server + admin-web), cross-link. Do NOT merge (leave for user).

## Self-review
- Spec §3 normal reset → S1,S2,W1,W2,W3. §4 force reset → S3,S4,W1,W4. §5 security → S2,S3. §6 testing → each task's tests + W5. ✔
- Types: `force_password_reset` consistent across S4 (payload), W1 (types), W4 (context). `platform:"web"` in W1 matches S1 branch. Endpoint `/api/auth/password/force-reset` consistent S3/W1. ✔
