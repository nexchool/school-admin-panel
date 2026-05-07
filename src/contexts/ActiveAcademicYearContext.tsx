"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ActiveAcademicYearValue = {
  academicYearId: string | null;
  setAcademicYearId: (id: string | null) => void;
};

const ActiveAcademicYearContext =
  createContext<ActiveAcademicYearValue | null>(null);

export function ActiveAcademicYearProvider({
  initialAcademicYearId,
  children,
}: {
  initialAcademicYearId: string | null;
  children: ReactNode;
}) {
  const [academicYearId, setAcademicYearId] = useState<string | null>(
    initialAcademicYearId,
  );
  return (
    <ActiveAcademicYearContext.Provider
      value={{ academicYearId, setAcademicYearId }}
    >
      {children}
    </ActiveAcademicYearContext.Provider>
  );
}

export function useActiveAcademicYear(): ActiveAcademicYearValue {
  const ctx = useContext(ActiveAcademicYearContext);
  if (!ctx) {
    throw new Error(
      "useActiveAcademicYear must be used inside ActiveAcademicYearProvider",
    );
  }
  return ctx;
}
