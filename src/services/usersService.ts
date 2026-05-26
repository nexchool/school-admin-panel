import { apiPatch } from "@/services/api";

export type UpdateDefaultUnitResponse = {
  data: { default_unit_id: string | null };
  message: string;
};

export const usersService = {
  updateDefaultUnit(defaultUnitId: string | null): Promise<UpdateDefaultUnitResponse> {
    return apiPatch<UpdateDefaultUnitResponse>("/api/users/me/default-unit", {
      default_unit_id: defaultUnitId,
    });
  },
};
