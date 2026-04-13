import { apiGet } from "@/services/api";

export interface DeviceRegistrationSummary {
  id: string;
  platform: string;
  provider: string;
  is_active: boolean;
  device_token_preview: string;
  last_used_at: string | null;
}

/**
 * GET /api/devices — push registrations for the current user (masked tokens).
 */
export async function fetchMyDevices(): Promise<{
  devices: DeviceRegistrationSummary[];
  count: number;
}> {
  const res = await apiGet<{
    devices?: DeviceRegistrationSummary[];
    count?: number;
  }>("/api/devices");
  const devices = Array.isArray(res.devices) ? res.devices : [];
  const count = typeof res.count === "number" ? res.count : devices.length;
  return { devices, count };
}

/** True if at least one active device row exists for push delivery. */
export async function hasActivePushRegistration(): Promise<boolean> {
  try {
    const { devices } = await fetchMyDevices();
    return devices.some((d) => d.is_active);
  } catch {
    return false;
  }
}
