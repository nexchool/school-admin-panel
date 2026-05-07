"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ActiveUnitValue = {
  unitId: string | null;
  setUnitId: (id: string | null) => void;
};

const ActiveUnitContext = createContext<ActiveUnitValue | null>(null);

export function ActiveUnitProvider({
  initialUnitId,
  children,
}: {
  initialUnitId: string | null;
  children: ReactNode;
}) {
  const [unitId, setUnitId] = useState<string | null>(initialUnitId);
  return (
    <ActiveUnitContext.Provider value={{ unitId, setUnitId }}>
      {children}
    </ActiveUnitContext.Provider>
  );
}

export function useActiveUnit(): ActiveUnitValue {
  const ctx = useContext(ActiveUnitContext);
  if (!ctx) {
    throw new Error("useActiveUnit must be used inside ActiveUnitProvider");
  }
  return ctx;
}
