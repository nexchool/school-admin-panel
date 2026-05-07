"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/AuthProvider";
import { usersService } from "@/services/usersService";

export function useUpdateDefaultUnit() {
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (defaultUnitId: string | null) =>
      usersService.updateDefaultUnit(defaultUnitId),
    onSuccess: () => {
      refreshUser();
    },
    onError: () => {
      toast.error("Failed to update default unit");
    },
  });
}
