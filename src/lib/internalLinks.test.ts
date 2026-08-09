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
      for (const match of text.matchAll(/href=\{?"(\/[^"?#{}]*)"/g)) {
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

  it("recognises the finance compatibility layer as retired", () => {
    // Guards the detector: if `isRedirectStub` stopped matching, the test above
    // would pass by finding nothing retired rather than nothing linking to it.
    const retired = patterns.filter((p) => p.retired).map((p) => p.route);
    expect(retired).toContain("/finance/student-fees");
    expect(retired).toContain("/finance/invoices");
    expect(retired).not.toContain("/dashboard/finance/student-fees");
  });
});
