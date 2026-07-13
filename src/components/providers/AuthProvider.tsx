"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAccessToken,
  getRefreshToken,
  getUserData,
  getPermissions,
  getEnabledFeatures,
  getRoles,
  setAccessToken,
  setRefreshToken,
  setUserData,
  setPermissions,
  setEnabledFeatures,
  setRoles,
  getTenantId,
  setTenantId,
  getTenantName,
  setTenantName,
  getIsPlatformAdmin,
  setIsPlatformAdmin,
  getIsSubAdmin,
  setIsSubAdmin,
  getIsSetupComplete,
  setIsSetupComplete,
  getForcePasswordReset,
  setForcePasswordReset,
  getAllowedUnitIds,
  setAllowedUnitIds,
  clearAuth,
  setSessionCookie,
} from "@/lib/storage";
import { getCurrentSubdomain } from "@/lib/subdomain";
import { registerForbiddenHandler } from "@/lib/forbiddenHandler";
import {
  login as loginService,
  logout as logoutService,
  getProfile,
  type LoginResponse,
  type ProfileRole,
  type TenantChoice,
} from "@/services/authService";
import type { User } from "@/types/auth";

// Re-export for consumers that import User from this provider
export type { User } from "@/types/auth";

interface AuthContextType {
  user: User | null;
  permissions: string[];
  enabledFeatures: string[];
  roles: ProfileRole[];
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingTenantChoice: {
    tenants: TenantChoice[];
    email: string;
    password: string;
  } | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ requiresTenantChoice: boolean; forcePasswordReset: boolean }>;
  loginWithTenant: (tenantId: string) => Promise<{ forcePasswordReset: boolean }>;
  clearPendingTenantChoice: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAuthData: (data: LoginResponse) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: readonly string[]) => boolean;
  hasAllPermissions: (permissions: readonly string[]) => boolean;
  isFeatureEnabled: (featureKey: string) => boolean;
  /** Resolved school / tenant display name for chrome (sidebar, etc.). */
  tenantName: string | null;
  /** Active tenant id, mirrored from storage. Used to scope query cache. */
  tenantId: string | null;
  /** True when the user is a platform super-admin (god mode). */
  isPlatformAdmin: boolean;
  /** True when the user is a tenant sub-admin. */
  isSubAdmin: boolean;
  /**
   * The active tenant's school-setup completion state. Defaults to `true` so we
   * never flash a "setup incomplete" banner before login/profile resolves.
   */
  isSetupComplete: boolean;
  /**
   * True when the user must set a new password before continuing. Gates the
   * dashboard (RouteGuard redirects to /set-password) until cleared.
   */
  forcePasswordReset: boolean;
  /**
   * Branch (school-unit) ids the user is restricted to. `null` = unrestricted
   * (all branches — full School Admin / platform admin); an array is the
   * explicit allowed set used to lock the branch switcher.
   */
  allowedUnitIds: string[] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissionsState] = useState<string[]>([]);
  const [enabledFeatures, setEnabledFeaturesState] = useState<string[]>([]);
  const [roles, setRolesState] = useState<ProfileRole[]>([]);
  const [pendingTenantChoice, setPendingTenantChoice] = useState<{
    tenants: TenantChoice[];
    email: string;
    password: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantName, setTenantNameState] = useState<string | null>(null);
  const [tenantId, setTenantIdState] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdminState] = useState(false);
  const [isSubAdmin, setIsSubAdminState] = useState(false);
  // Default true so first paint (before login/profile resolves) never flashes a
  // false "setup incomplete" banner.
  const [isSetupComplete, setIsSetupCompleteState] = useState(true);
  const [forcePasswordReset, setForcePasswordResetState] = useState(false);
  // null = unrestricted (default); an array restricts the user to those units.
  const [allowedUnitIds, setAllowedUnitIdsState] = useState<string[] | null>(
    null
  );

  const setAuthData = useCallback(async (data: LoginResponse) => {
    if (!data.access_token || !data.refresh_token || !data.user) return;
    const features = data.enabled_features ?? [];
    const platformAdmin = data.is_platform_admin ?? false;
    const subAdmin = data.is_subadmin ?? false;
    // Default true: absence of the flag should never trigger a false banner.
    const setupComplete = data.is_setup_complete ?? true;
    const mustResetPassword = data.force_password_reset ?? false;
    // null/absent → unrestricted (all branches).
    const allowedUnits = data.allowed_unit_ids ?? null;
    const tenantLabel =
      data.tenant_name !== undefined
        ? (typeof data.tenant_name === "string" ? data.tenant_name.trim() : "") || null
        : undefined;

    const tasks: Promise<unknown>[] = [
      setAccessToken(data.access_token),
      setRefreshToken(data.refresh_token),
      setUserData(data.user),
      setPermissions(data.permissions || []),
      setEnabledFeatures(features),
      setRoles([]),
      setIsPlatformAdmin(platformAdmin),
      setIsSubAdmin(subAdmin),
      setIsSetupComplete(setupComplete),
      setForcePasswordReset(mustResetPassword),
      setAllowedUnitIds(allowedUnits),
    ];
    if (data.tenant_id) tasks.push(setTenantId(data.tenant_id));
    if (tenantLabel !== undefined) {
      tasks.push(setTenantName(tenantLabel));
    }

    await Promise.all(tasks);
    setSessionCookie();
    if (data.tenant_id) {
      // React-mirror of storage so query keys re-scope synchronously when
      // the active tenant changes (login, tenant switch).
      setTenantIdState(data.tenant_id);
    }
    setUser(data.user);
    setPermissionsState(data.permissions || []);
    setEnabledFeaturesState(features);
    setRolesState([]);
    setIsPlatformAdminState(platformAdmin);
    setIsSubAdminState(subAdmin);
    setIsSetupCompleteState(setupComplete);
    setForcePasswordResetState(mustResetPassword);
    setAllowedUnitIdsState(allowedUnits);
    if (tenantLabel !== undefined) {
      setTenantNameState(tenantLabel);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile.user);
      await setUserData(profile.user);
      // For a platform super-admin the profile returns permissions:["system.manage"];
      // storing it verbatim keeps god mode intact across a refresh.
      setPermissionsState(profile.permissions ?? []);
      setEnabledFeaturesState(profile.enabled_features ?? []);
      const roleList = profile.roles ?? [];
      setRolesState(roleList);
      const tn = profile.tenant_name?.trim() || null;
      setTenantNameState(tn);
      const platformAdmin = profile.is_platform_admin ?? false;
      const subAdmin = profile.is_subadmin ?? false;
      const setupComplete = profile.is_setup_complete ?? true;
      const mustResetPassword = profile.force_password_reset ?? false;
      const allowedUnits = profile.allowed_unit_ids ?? null;
      setIsPlatformAdminState(platformAdmin);
      setIsSubAdminState(subAdmin);
      setIsSetupCompleteState(setupComplete);
      setForcePasswordResetState(mustResetPassword);
      setAllowedUnitIdsState(allowedUnits);
      await Promise.all([
        setPermissions(profile.permissions ?? []),
        setEnabledFeatures(profile.enabled_features ?? []),
        setRoles(roleList),
        setTenantName(tn),
        setIsPlatformAdmin(platformAdmin),
        setIsSubAdmin(subAdmin),
        setIsSetupComplete(setupComplete),
        setForcePasswordReset(mustResetPassword),
        setAllowedUnitIds(allowedUnits),
      ]);
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  }, []);

  // Self-correct stale permissions: when any tenant-scoped API call 403s, the
  // api client invokes this handler so we re-fetch the profile. The refreshed
  // permissions flow into context state, which the (already-mounted) RouteGuard
  // reads to redirect off a now-forbidden route to /dashboard. The registry
  // throttles bursts of 403s to a single refresh (loop guard), and the /profile
  // call itself is excluded from triggering. We only react when authenticated —
  // a logged-out 403 should not spin up a profile fetch.
  useEffect(() => {
    return registerForbiddenHandler(() => {
      if (!user) return;
      void refreshUser();
    });
  }, [user, refreshUser]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [
          accessToken,
          refreshToken,
          userData,
          userPermissions,
          storedFeatures,
          storedRoles,
          storedTenantName,
          storedTenantId,
          storedIsPlatformAdmin,
          storedIsSubAdmin,
          storedIsSetupComplete,
          storedForcePasswordReset,
          storedAllowedUnitIds,
        ] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
          getUserData(),
          getPermissions(),
          getEnabledFeatures(),
          getRoles(),
          getTenantName(),
          getTenantId(),
          getIsPlatformAdmin(),
          getIsSubAdmin(),
          getIsSetupComplete(),
          getForcePasswordReset(),
          getAllowedUnitIds(),
        ]);

        if (accessToken && refreshToken && userData) {
          setUser(userData);
          setPermissionsState(userPermissions || []);
          setEnabledFeaturesState(storedFeatures || []);
          setRolesState(storedRoles);
          setTenantNameState(storedTenantName);
          setTenantIdState(storedTenantId);
          setIsPlatformAdminState(storedIsPlatformAdmin ?? false);
          setIsSubAdminState(storedIsSubAdmin ?? false);
          // null (never persisted) → true, so we never flash a false banner.
          setIsSetupCompleteState(storedIsSetupComplete ?? true);
          // null (never persisted) → not forced.
          setForcePasswordResetState(storedForcePasswordReset ?? false);
          // null (never persisted) → unrestricted.
          setAllowedUnitIdsState(storedAllowedUnitIds);
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ requiresTenantChoice: boolean; forcePasswordReset: boolean }> => {
      setPendingTenantChoice(null);
      const subdomain = getCurrentSubdomain();
      const response = await loginService({
        email,
        password,
        ...(subdomain ? { subdomain } : {}),
      });
      if (response.requires_tenant_choice && response.tenants?.length) {
        setPendingTenantChoice({ tenants: response.tenants, email, password });
        return { requiresTenantChoice: true, forcePasswordReset: false };
      }
      queryClient.clear();
      await setAuthData(response);
      await refreshUser();
      return {
        requiresTenantChoice: false,
        forcePasswordReset: response.force_password_reset ?? false,
      };
    },
    [setAuthData, refreshUser, queryClient]
  );

  const loginWithTenant = useCallback(
    async (tenantId: string): Promise<{ forcePasswordReset: boolean }> => {
      if (!pendingTenantChoice) return { forcePasswordReset: false };
      const { email, password } = pendingTenantChoice;
      setPendingTenantChoice(null);
      const response = await loginService({
        email,
        password,
        tenant_id: tenantId,
      });
      queryClient.clear();
      await setAuthData(response);
      await refreshUser();
      return { forcePasswordReset: response.force_password_reset ?? false };
    },
    [pendingTenantChoice, setAuthData, refreshUser, queryClient]
  );

  const clearPendingTenantChoice = useCallback(() => setPendingTenantChoice(null), []);

  const logout = useCallback(async () => {
    try {
      await logoutService();
    } catch {
      /* ignore */
    }
    await clearAuth();
    // Flush all cached query data so a subsequent login (possibly a different
    // tenant) never sees stale data from the previous session.
    queryClient.clear();
    setUser(null);
    setPermissionsState([]);
    setEnabledFeaturesState([]);
    setRolesState([]);
    setTenantNameState(null);
    setTenantIdState(null);
    setIsPlatformAdminState(false);
    setIsSubAdminState(false);
    setIsSetupCompleteState(true);
    setForcePasswordResetState(false);
    setAllowedUnitIdsState(null);
  }, [queryClient]);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!permissions?.length) return false;
      if (permissions.includes(permission)) return true;
      const resource = permission.split(".")[0];
      if (permissions.includes(`${resource}.manage`)) return true;
      if (permissions.includes("system.manage")) return true;
      return false;
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: readonly string[]) => perms.some((p) => hasPermission(p)),
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (perms: readonly string[]) => perms.every((p) => hasPermission(p)),
    [hasPermission]
  );

  const isFeatureEnabled = useCallback(
    (featureKey: string): boolean => {
      if (!enabledFeatures?.length) return true;
      return enabledFeatures.includes(featureKey);
    },
    [enabledFeatures]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        enabledFeatures,
        roles,
        isAuthenticated: !!user,
        isLoading,
        pendingTenantChoice,
        login,
        loginWithTenant,
        clearPendingTenantChoice,
        logout,
        refreshUser,
        setAuthData,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isFeatureEnabled,
        tenantName,
        tenantId,
        isPlatformAdmin,
        isSubAdmin,
        isSetupComplete,
        forcePasswordReset,
        allowedUnitIds,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
