import { describe, expect, it } from "vitest";
import {
  requiredPermissionsForPath,
  ROUTE_PERMISSIONS,
  TRANSPORT_NAV_PERMS,
} from "./navPermissions";

describe("requiredPermissionsForPath", () => {
  describe("longest-prefix wins", () => {
    it("/dashboard/finance resolves to finance perms, not the bare /dashboard", () => {
      const perms = requiredPermissionsForPath("/dashboard/finance");
      expect(perms).toEqual(ROUTE_PERMISSIONS["/dashboard/finance"]);
      // /dashboard is ungated (absent from the map), so a bad match would be null.
      expect(perms).toContain("finance.read");
    });

    it("/dashboard/transport resolves to transport perms", () => {
      const perms = requiredPermissionsForPath("/dashboard/transport");
      expect(perms).toEqual(TRANSPORT_NAV_PERMS);
    });

    it("nested route under finance still resolves to finance perms", () => {
      expect(requiredPermissionsForPath("/dashboard/finance/invoices")).toEqual(
        ROUTE_PERMISSIONS["/dashboard/finance"]
      );
    });
  });

  describe("prefix boundary correctness", () => {
    it("/students/123 matches the /students prefix", () => {
      expect(requiredPermissionsForPath("/students/123")).toEqual(
        ROUTE_PERMISSIONS["/students"]
      );
    });

    it("/students-archive does NOT match /students (segment boundary)", () => {
      expect(requiredPermissionsForPath("/students-archive")).toBeNull();
    });

    it("exact /students matches", () => {
      expect(requiredPermissionsForPath("/students")).toEqual(
        ROUTE_PERMISSIONS["/students"]
      );
    });
  });

  describe("always-ungated routes return null", () => {
    it.each(["/dashboard", "/profile", "/help"])("%s → null", (path) => {
      expect(requiredPermissionsForPath(path)).toBeNull();
    });
  });

  describe("removed operator routes return null", () => {
    // The school-setup wizard and /onboarding moved to the super-admin panel
    // (control-plane split), so they're no longer admin-web routes.
    it.each(["/school-setup", "/school-setup/units", "/onboarding"])(
      "%s → null",
      (path) => {
        expect(requiredPermissionsForPath(path)).toBeNull();
      }
    );
  });

  describe("unknown routes return null", () => {
    it.each(["/", "/totally-unknown", "/foo/bar"])("%s → null", (path) => {
      expect(requiredPermissionsForPath(path)).toBeNull();
    });
  });

  describe("known module routes return expected perm arrays", () => {
    it("/sub-admins → [subadmin.manage]", () => {
      expect(requiredPermissionsForPath("/sub-admins")).toEqual([
        "subadmin.manage",
      ]);
    });

    it("/audit-log → [audit_log.view]", () => {
      expect(requiredPermissionsForPath("/audit-log")).toEqual([
        "audit_log.view",
      ]);
    });

    it("/teachers includes teacher.read and teacher.manage", () => {
      const perms = requiredPermissionsForPath("/teachers");
      expect(perms).toContain("teacher.read");
      expect(perms).toContain("teacher.manage");
    });
  });
});
