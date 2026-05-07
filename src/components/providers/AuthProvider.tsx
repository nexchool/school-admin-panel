"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
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
  setTenantId,
  getTenantName,
  setTenantName,
  clearAuth,
  setSessionCookie,
} from "@/lib/storage";
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
  login: (email: string, password: string) => Promise<{ requiresTenantChoice: boolean }>;
  loginWithTenant: (tenantId: string) => Promise<void>;
  clearPendingTenantChoice: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setAuthData: (data: LoginResponse) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isFeatureEnabled: (featureKey: string) => boolean;
  /** Resolved school / tenant display name for chrome (sidebar, etc.). */
  tenantName: string | null;
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

  const setAuthData = useCallback(async (data: LoginResponse) => {
    if (!data.access_token || !data.refresh_token || !data.user) return;
    const features = data.enabled_features ?? [];
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
    ];
    if (data.tenant_id) tasks.push(setTenantId(data.tenant_id));
    if (tenantLabel !== undefined) {
      tasks.push(setTenantName(tenantLabel));
    }

    await Promise.all(tasks);
    setSessionCookie();
    setUser(data.user);
    setPermissionsState(data.permissions || []);
    setEnabledFeaturesState(features);
    setRolesState([]);
    if (tenantLabel !== undefined) {
      setTenantNameState(tenantLabel);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getProfile();
      setUser(profile.user);
      await setUserData(profile.user);
      setPermissionsState(profile.permissions ?? []);
      setEnabledFeaturesState(profile.enabled_features ?? []);
      const roleList = profile.roles ?? [];
      setRolesState(roleList);
      const tn = profile.tenant_name?.trim() || null;
      setTenantNameState(tn);
      await Promise.all([
        setPermissions(profile.permissions ?? []),
        setEnabledFeatures(profile.enabled_features ?? []),
        setRoles(roleList),
        setTenantName(tn),
      ]);
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  }, []);

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
        ] = await Promise.all([
          getAccessToken(),
          getRefreshToken(),
          getUserData(),
          getPermissions(),
          getEnabledFeatures(),
          getRoles(),
          getTenantName(),
        ]);

        if (accessToken && refreshToken && userData) {
          setUser(userData);
          setPermissionsState(userPermissions || []);
          setEnabledFeaturesState(storedFeatures || []);
          setRolesState(storedRoles);
          setTenantNameState(storedTenantName);
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
    async (email: string, password: string): Promise<{ requiresTenantChoice: boolean }> => {
      setPendingTenantChoice(null);
      const response = await loginService({ email, password });
      if (response.requires_tenant_choice && response.tenants?.length) {
        setPendingTenantChoice({ tenants: response.tenants, email, password });
        return { requiresTenantChoice: true };
      }
      await setAuthData(response);
      await refreshUser();
      return { requiresTenantChoice: false };
    },
    [setAuthData, refreshUser]
  );

  const loginWithTenant = useCallback(
    async (tenantId: string) => {
      if (!pendingTenantChoice) return;
      const { email, password } = pendingTenantChoice;
      setPendingTenantChoice(null);
      const response = await loginService({
        email,
        password,
        tenant_id: tenantId,
      });
      await setAuthData(response);
      await refreshUser();
    },
    [pendingTenantChoice, setAuthData, refreshUser]
  );

  const clearPendingTenantChoice = useCallback(() => setPendingTenantChoice(null), []);

  const logout = useCallback(async () => {
    try {
      await logoutService();
    } catch {
      /* ignore */
    }
    await clearAuth();
    setUser(null);
    setPermissionsState([]);
    setEnabledFeaturesState([]);
    setRolesState([]);
    setTenantNameState(null);
  }, []);

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
    (perms: string[]) => perms.some((p) => hasPermission(p)),
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (perms: string[]) => perms.every((p) => hasPermission(p)),
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
