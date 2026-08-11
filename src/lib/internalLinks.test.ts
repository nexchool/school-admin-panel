/**
 * Every internal link must point at a page that exists.
 *
 * Next.js resolves routes from the filesystem, so a `<Link href="/academics">`
 * whose page was deleted is not a build error, not a type error and not a lint
 * error. It is a 404 that only appears when someone clicks it — and the three
 * this test was written for had all survived review:
 *
 *   - `/academics`, from four "Back to academics" breadcrumbs, after the
 *     standalone hub was replaced by a collapsible sidebar group
 *   - `/dashboard/transport/enrollments`, from the year-transition completion
 *     screen, where the screen is actually called `students`
 *   - `/school-setup`, from the setup banner and three structural lists, after
 *     onboarding moved to the panel
 *
 * The check is deliberately static: it reads the route tree off disk and the
 * hrefs out of the source, so it costs nothing and cannot be skipped by a test
 * that forgets to render a component.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "..");
const APP = path.join(SRC, "app");

/**
 * A page whose whole job is to redirect somewhere else.
 *
 * The `/finance/*` tree is seven of these, kept so links and bookmarks from
 * before the routes moved still land somewhere sensible. They are a
 * compatibility layer for the outside world, not routes this app should link
 * to — an internal link pointing at one costs a round trip and quietly keeps
 * the old path alive past the point anyone meant to retire it.
 *
 * Detected as: imports `redirect` from next/navigation, and renders nothing.
 * A page that redirects conditionally and otherwise renders has JSX, so it is
 * a real route and not caught here.
 */
function isRedirectStub(source: string): boolean {
  const importsRedirect = /import\s*\{[^}]*\bredirect\b[^}]*\}\s*from\s*["']next\/navigation["']/.test(
    source
  );
  const rendersSomething = /return\s*\(?\s*</.test(source);
  return importsRedirect && !rendersSomething;
}

/** Route patterns Next.js will serve, as regexes. */
function routePatterns(): {
  pattern: RegExp;
  route: string;
  retired: boolean;
}[] {
  const routes: { route: string; retired: boolean }[] = [];

  const walk = (dir: string, segment: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // `(group)` directories organise files without adding a URL segment.
        const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
        walk(full, isGroup ? segment : `${segment}/${entry.name}`);
      } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        routes.push({
          route: segment || "/",
          retired: isRedirectStub(fs.readFileSync(full, "utf8")),
        });
      }
    }
  };
  walk(APP, "");

  return routes.map(({ route, retired }) => ({
    route,
    retired,
    pattern: new RegExp(
      `^${route
        .replace(/\[\.\.\.[^\]]+\]/g, ".*") // catch-all [...slug]
        .replace(/\[[^\]]+\]/g, "[^/]+")}$` // dynamic [id]
    ),
  }));
}

/** Every literal internal href written in the source, with where it came from. */
function internalHrefs(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || entry.name.includes(".test.")) continue;

      const text = fs.readFileSync(full, "utf8");
      // Only literal hrefs. A template literal is a runtime value this static
      // check cannot resolve, and guessing at one would produce false failures.
      //
      // Both spellings: `href="/x"` on a JSX element, and `href: "/x"` in an
      // object. The second matters more than it looks — the sidebar is a list
      // of objects, so until this matched, the one file whose links are the
      // app's whole navigation was the one file this test never read.
      for (const match of text.matchAll(/href[=:]\s*\{?"(\/[^"?#{}]*)"/g)) {
        const href = match[1].replace(/\/$/, "") || "/";
        const where = path.relative(SRC, full);
        found.set(href, (found.get(href) ?? new Set()).add(where));
      }
    }
  };
  walk(SRC);

  return found;
}

describe("internal links", () => {
  const patterns = routePatterns();
  const hrefs = internalHrefs();

  it("finds the route tree and the links", () => {
    // Guards the test itself: a bad path here would make everything below
    // pass by finding nothing to check.
    expect(patterns.length).toBeGreaterThan(50);
    expect(hrefs.size).toBeGreaterThan(20);
  });

  it("every internal href resolves to a page that exists", () => {
    const broken = [...hrefs.entries()]
      .filter(([href]) => !patterns.some(({ pattern }) => pattern.test(href)))
      .map(([href, files]) => `${href}  <- ${[...files].sort().join(", ")}`);

    expect(broken).toEqual([]);
  });

  it("no internal href points at a retired redirect route", () => {
    // Those routes exist for the outside world — an old bookmark, a link in an
    // email sent before the move. Inside the app, link to where the page
    // actually lives.
    const retired = patterns.filter((p) => p.retired);
    const hops = [...hrefs.entries()]
      .filter(([href]) => retired.some(({ pattern }) => pattern.test(href)))
      .map(([href, files]) => `${href}  <- ${[...files].sort().join(", ")}`);

    expect(hops).toEqual([]);
  });

  /**
   * Routes a user is meant to arrive at without following a link from inside
   * the app. Everything else must be linked from somewhere, or nobody can get
   * to it — the failure this list exists to keep honest.
   *
   * Each entry says how a user actually arrives, because "nothing links to it"
   * and "nothing *should* link to it" look identical from here, and only the
   * second one is allowed.
   */
  const ARRIVED_AT_DIRECTLY: Record<string, string> = {
    "/": "the app's entry point",
    "/login": "typed, or redirected to when signed out",
    "/forgot-password": "linked from the login form",
    "/reset-password": "opened from a link in an email",
    "/set-password": "router.replace after a login that forces a reset",
    "/school-not-found": "redirect target when a subdomain resolves to nothing",
    "/enter": "the panel's one-click login-as-tenant lands here, from another app",
    "/dashboard": "where login lands",
    "/academics/calendar/setup":
      "linked from the calendar, but as `/…/setup?year=${id}` — a template " +
      "literal this static check cannot resolve",
    "/academics/subjects":
      "a client-side shim that router.replace()s to /subjects; it redirects " +
      "in an effect rather than with next/navigation's redirect(), so the " +
      "stub detector above does not see it",
  };

  it("every page can be reached from somewhere in the app", () => {
    // The reverse of the first test, and the one that was missing. A page with
    // no link into it is not a 404 and not a build error — it is a screen that
    // simply is not in the product. Grades and Programmes were both finished
    // and had no link anywhere in the app.
    //
    // Know what this does not catch: a page linked from *somewhere* passes,
    // however buried that link is. Bell Schedules had exactly one — a word in
    // a sentence on the Settings page — so it counted as reached here while
    // being, in practice, missing from the product. Only a person clicking
    // around found that. This test is the floor, not the ceiling.
    const unreachable = patterns
      .filter((p) => !p.retired)
      .filter((p) => !p.route.includes("[")) // detail pages are linked from their list
      .map((p) => p.route)
      .filter((route) => !hrefs.has(route))
      .filter((route) => !(route in ARRIVED_AT_DIRECTLY));

    expect(unreachable).toEqual([]);
  });

  it("the reachability allowlist has no stale entries", () => {
    // An allowlist that outlives its reason silently permits the next orphan.
    const routes = new Set(patterns.map((p) => p.route));
    const gone = Object.keys(ARRIVED_AT_DIRECTLY).filter((r) => !routes.has(r));
    expect(gone).toEqual([]);
  });

  it("recognises the finance compatibility layer as retired", () => {
    // Guards the detector: if `isRedirectStub` stopped matching, the test above
    // would pass by finding nothing retired rather than nothing linking to it.
    const retired = patterns.filter((p) => p.retired).map((p) => p.route);
    expect(retired).toContain("/finance/student-fees");
    expect(retired).toContain("/finance/invoices");
    expect(retired).not.toContain("/dashboard/finance/student-fees");
  });
});
