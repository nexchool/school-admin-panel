import { describe, expect, it } from "vitest";
import { setupBannerFor } from "./setupBanner";

describe("setupBannerFor", () => {
  it("platform admin + incomplete → actionable", () => {
    expect(
      setupBannerFor({
        isPlatformAdmin: true,
        isSubAdmin: false,
        isSetupComplete: false,
      })
    ).toBe("actionable");
  });

  it("platform admin always → actionable, even when setup is complete", () => {
    // The live status query downstream decides whether to actually render it.
    expect(
      setupBannerFor({
        isPlatformAdmin: true,
        isSubAdmin: false,
        isSetupComplete: true,
      })
    ).toBe("actionable");
  });

  it("school admin + incomplete → admin-contact", () => {
    expect(
      setupBannerFor({
        isPlatformAdmin: false,
        isSubAdmin: false,
        isSetupComplete: false,
      })
    ).toBe("admin-contact");
  });

  it("sub-admin + incomplete → subadmin-contact", () => {
    expect(
      setupBannerFor({
        isPlatformAdmin: false,
        isSubAdmin: true,
        isSetupComplete: false,
      })
    ).toBe("subadmin-contact");
  });

  it("school admin + complete → none", () => {
    expect(
      setupBannerFor({
        isPlatformAdmin: false,
        isSubAdmin: false,
        isSetupComplete: true,
      })
    ).toBe("none");
  });

  it("sub-admin + complete → none", () => {
    expect(
      setupBannerFor({
        isPlatformAdmin: false,
        isSubAdmin: true,
        isSetupComplete: true,
      })
    ).toBe("none");
  });
});
