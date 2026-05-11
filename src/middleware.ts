import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routes that require authentication */
const PROTECTED_PATHS = [
  "/dashboard",
  "/academics",
  "/students",
  "/teachers",
  "/classes",
  "/subjects",
  "/attendance",
  "/finance",
  "/holidays",
  "/hostel",
  "/profile",
];

/** Routes only for unauthenticated users (e.g. login) */
const AUTH_PATHS = ["/login"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

const SESSION_COOKIE = "admin-web-session";

/**
 * Middleware checks for session cookie on protected routes.
 * Cookie is set client-side on login, cleared on logout.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get(SESSION_COOKIE)?.value;

  // Redirect root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protected routes require session cookie
  if (isProtected(pathname) && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users hitting login get redirected to dashboard
  if (isAuthPath(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
