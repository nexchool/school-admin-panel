import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { OPTIONAL_MODULES } from "./optionalModules";

/**
 * A module switched off has to be off in the app, not only in the API.
 *
 * A 403 the user never sees is worth something; a 403 they reach by clicking
 * a link the app was still offering is worth nothing. It reads as the product
 * being broken, because from where they are sitting it is.
 *
 * So: every optional module must have a page that refuses. These read the
 * source tree rather than render anything — the question is whether the guard
 * exists at all, and a guard nobody wired up renders perfectly.
 */

const APP_DIR = join(__dirname, "..", "app", "(dashboard)");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Feature keys named in a `FeatureRequiredPage` anywhere under (dashboard). */
function gatedFeatures(): Set<string> {
  const found = new Set<string>();
  for (const file of walk(APP_DIR)) {
    if (!file.endsWith(".tsx")) continue;
    const source = readFileSync(file, "utf8");
    if (!source.includes("FeatureRequiredPage")) continue;
    for (const match of source.matchAll(/feature=["']([a-z_]+)["']/g)) {
      found.add(match[1]);
    }
  }
  return found;
}

describe("every optional module is refused in the app, not just in the API", () => {
  const gated = gatedFeatures();

  it.each(OPTIONAL_MODULES)("%s has a page that refuses", (feature) => {
    expect(gated).toContain(feature);
  });

  it("gates nothing that is not optional", () => {
    // A gate on a core module is a switch that can never flip — dead code that
    // reads like a live rule, and the next person has to work out which.
    const notOptional = [...gated].filter(
      (feature) => !(OPTIONAL_MODULES as readonly string[]).includes(feature)
    );
    expect(notOptional).toEqual([]);
  });
});
