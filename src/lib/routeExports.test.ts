/**
 * A route module exports only what Next.js allows.
 *
 * Next generates a type per route asserting that a `page`/`layout`/`route` file
 * exports nothing beyond `default` and its own config symbols. Anything else is
 * a `tsc` error — but the generated type only exists once the dev server has
 * compiled that route, so the failure is invisible until it isn't: it passed
 * locally all session and would have failed a clean CI typecheck.
 *
 * `bell-schedules/page.tsx` exported a `periodKindClass` helper that nothing
 * imported and nothing called. ESLint reported the unused symbol and not the
 * export rule; the two together are what made it easy to miss.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP = path.resolve(__dirname, "..", "app");

/** Named exports Next.js permits from a route module. */
const ALLOWED = new Set([
  "default",
  "config",
  "generateStaticParams",
  "metadata",
  "generateMetadata",
  "revalidate",
  "dynamic",
  "dynamicParams",
  "fetchCache",
  "runtime",
  "preferredRegion",
  "maxDuration",
  "viewport",
  "generateViewport",
  "experimental_ppr",
]);

const ROUTE_FILE = /^(page|layout|route|template|error|loading|not-found)\.tsx?$/;

function routeModules(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (ROUTE_FILE.test(entry.name)) found.push(full);
    }
  };
  walk(APP);
  return found;
}

describe("route modules", () => {
  const modules = routeModules();

  it("finds the route tree", () => {
    // Guards the check itself: a wrong path would report no offenders because
    // it looked at nothing.
    expect(modules.length).toBeGreaterThan(50);
  });

  it("export only what Next.js allows", () => {
    const offenders: string[] = [];

    for (const file of modules) {
      const source = fs.readFileSync(file, "utf8");
      const where = path.relative(APP, file);

      for (const match of source.matchAll(
        /^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/gm
      )) {
        if (!ALLOWED.has(match[1])) offenders.push(`${where} exports ${match[1]}`);
      }
      // A type export is erased at build time and Next tolerates it, but it
      // still means a route file is doubling as a module someone imports from.
      for (const match of source.matchAll(/^export\s+(?:type|interface)\s+(\w+)/gm)) {
        offenders.push(`${where} exports type ${match[1]}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
