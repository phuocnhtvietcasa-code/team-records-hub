import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Period } from "./finance";

interface FilterState {
  employeeIds: string[] | null; // null = all readable employees; [] = none
  period: Period;
  setEmployeeIds: (v: string[] | null) => void;
  setPeriod: (p: Period) => void;
}

const Ctx = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [employeeIds, setEmployeeIds] = useState<string[] | null>(null);
  const [period, setPeriod] = useState<Period>("year");
  const value = useMemo(() => ({ employeeIds, period, setEmployeeIds, setPeriod }), [employeeIds, period]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters() {
  const v = useContext(Ctx);
  if (!v) throw new Error("FilterProvider missing");
  return v;
}
