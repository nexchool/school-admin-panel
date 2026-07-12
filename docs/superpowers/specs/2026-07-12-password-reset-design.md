# Password reset (admin-web) — design spec

- **Date:** 2026-07-12
- **Repos:** `server` (Flask) + `admin-web` (Next.js). Mobile UI is a later story.
- **Branches:** `feature/password-reset` on both.
- **Status:** Autonomous build (user waived scope approval).

## 1. Goal & scope

Complete two traditional flows for admin-web:

1. **Normal password reset** — forgot → emailed link → set new password.
2. **Force password reset** — accounts an admin creates (and emails credentials to) must set a new password on first login before using the app.

Backend reset endpoints already exist and work; the gaps are (a) the reset link targets the mobile app, not admin-web, (b) no admin-web reset/forgot UI, (c) `force_password_reset` is never set on sub-admin creation nor surfaced to admin-web. Mobile reset UI is **out of scope** (later).

## 2. Current state (from exploration)

- `POST /api/auth/password/forgot` (`server/modules/auth/routes.py:604`) — generates `reset_password_token` on the User row, emails `PASSWORD_RESET` with `reset_url`. Enumeration-safe (always 200).
- `POST /api/auth/password/reset` (`routes.py:658`) — validates `{email, token, new_password}`, sets password, clears token, revokes all sessions. No strength check.
- Token: columns `reset_password_token` / `reset_password_sent_at` on `User` (`server/modules/auth/models.py`), expiry `RESET_TOKEN_EXP_MINUTES` (default 30). Helpers `generate_reset_password_token()`, `is_reset_token_valid()`.
- Password hashing: Werkzeug pbkdf2 (`User.set_password`/`check_password`). Strength helper `services._is_password_strong()` (≥8 chars + ≥1 digit).
- Reset URL: `get_reset_password_url()` (`server/config/settings.py:212`) builds a **mobile deep link** — must branch for web.
- Email: `notification_dispatcher.dispatch(...)`; templates DB-seeded; `PASSWORD_RESET` template renders `reset_url`.
- Sub-admin create: `create_sub_admin` (`server/modules/sub_admins/services.py:445`) — admin types password, `email_verified=True`, emails `ADMIN_CREDENTIALS` (plaintext password + login_url). Does **not** set `force_password_reset`.
- Login success payload (`routes.py:428`) has no `force_password_reset`. `admin-web` `LoginResponse`/`ProfileResponse` lack it. `AuthProvider` has no force handling; redirect keys off `is_setup_complete`.
- Frontend: `forgotPassword({email})` exists (`authService.ts:54`); `RESET_PASSWORD` constant exists but unused; `/forgot-password` is a stub; no `/reset-password` page; no `resetPassword`/`changePassword`.
- Rate limiting: only `/login` is limited. `forgot`/`reset` are not.

## 3. Design — normal reset

### Server
- **Web reset URL.** Add `get_admin_web_reset_url(token, email, subdomain)` in `config/settings.py`: derive from a new env `ADMIN_WEB_BASE_URL` (default `http://localhost:3000`), injecting the tenant subdomain → `http://{subdomain}.localhost:3000/reset-password?token=…&email=…` (prod: `https://{subdomain}.{domain}/…`). No client-supplied URL (avoids open redirect).
- **Platform branch.** `forgot_password` accepts optional `platform` in the body. `platform == "web"` → web URL; otherwise the existing mobile deep link (mobile app unchanged).
- **Strength check** on `/password/reset` — reuse `_is_password_strong` (422 on weak), matching the change flow.
- **Rate limit** `forgot` and `reset` (`@limiter.limit("5 per minute")`).

### admin-web
- `forgotPassword` sends `{ email, platform: "web" }`.
- Add `resetPassword({ email, token, new_password })` → `API_ENDPOINTS.RESET_PASSWORD`.
- `/forgot-password/page.tsx` — replace stub with a real form: email → `forgotPassword` → success state ("If that email exists, a reset link is on its way"). Keep current styling + "Back to sign in".
- `/reset-password/page.tsx` (new) — reads `token` + `email` from query; form = new password + confirm (RHF+Zod, min 8 + 1 digit, match); calls `resetPassword`; success → redirect to `/login?reset=1` with a success toast/banner; handles invalid/expired token (message + link back to forgot).

## 4. Design — force password reset

### Server
- Set `force_password_reset = True` in `create_sub_admin` (and in `reset_sub_admin_password`, so an admin-initiated reset also forces a change).
- Include `force_password_reset` (bool) in the **login** success payload (`routes.py:428`) and the **profile** response (`routes.py:789`).
- New endpoint **`POST /api/auth/password/force-reset`** (`@auth_required`): body `{ new_password }`. Strength-check, `set_password`, `force_password_reset=False`, revoke other sessions (keep current), 200. No current-password required — the user is already authenticated via the just-issued token from logging in with the temporary password.

### admin-web
- `LoginResponse` + `ProfileResponse` gain `force_password_reset?: boolean`; `AuthProvider` exposes `forcePasswordReset` in context, set from login + refreshed profile.
- Add `forceResetPassword({ new_password })` → `API_ENDPOINTS.FORCE_RESET_PASSWORD` (`/api/auth/password/force-reset`).
- After a successful login, if `force_password_reset` → `router.replace("/set-password")` instead of `/dashboard`.
- New `/set-password/page.tsx` (authenticated, in `(auth)` group): "Set your password" — new + confirm, calls `forceResetPassword`, then → `/dashboard`.
- `RouteGuard` (`src/components/layout/RouteGuard.tsx`): while `forcePasswordReset` is true, redirect any dashboard route to `/set-password` (mirrors the existing `is_setup_complete` gate). The set-password screen has no "skip".

## 5. Security

- Rate-limit forgot/reset/force-reset. Enumeration-safe forgot (unchanged). Session revocation on reset (all) and force-reset (others). Strength check everywhere a password is set via these flows. Reset token expiry unchanged (30 min). Force gate is frontend-enforced for v1 (backend hard-gate on all routes is a noted follow-up, not built here).

## 6. Testing

**Server (pytest):**
- `forgot` with `platform="web"` produces an admin-web `/reset-password` URL containing token+email (assert via the dispatched notification `extra_data`, mocking the dispatcher); default/mobile unchanged.
- `reset`: success sets password + clears token + revokes sessions; invalid token → 400; expired token → 400; weak password → 422.
- `force-reset`: authed, sets password + clears `force_password_reset`; weak → 422; unauth → 401.
- `create_sub_admin` sets `force_password_reset=True`; login for that user returns `force_password_reset: true`, and false after force-reset.

**admin-web (vitest):**
- reset-password form: validation (min length, digit, mismatch) and calls `resetPassword` with parsed query token/email.
- a small AuthProvider/route test that `force_password_reset` routes to `/set-password` (if feasible without heavy mocking; otherwise cover the redirect helper).

## 7. Out of scope

Mobile reset UI; rewiring the profile self-serve "change password" (still uses the email-link flow); hashing the stored reset token; backend hard-gating every route on `force_password_reset`.
