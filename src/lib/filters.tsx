import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Period } from "./finance";

interface FilterState {
  employeeIds: string[] | null; // null = all readable employees; [] = none
  period: Period;
  /** Tuần trong tháng / tháng trong năm / quý đang chọn (1-based); null = kỳ hiện tại. */
  sub: number | null;
  setEmployeeIds: (v: string[] | null) => void;
  setPeriod: (p: Period) => void;
  setSub: (n: number | null) => void;
}

const Ctx = createContext<FilterState | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [employeeIds, setEmployeeIds] = useState<string[] | null>(null);
  const [period, setPeriodState] = useState<Period>("year");
  const [sub, setSub] = useState<number | null>(null);
  const setPeriod = (p: Period) => {
    setPeriodState(p);
    setSub(null); // đổi kỳ thì quay về giá trị mặc định (kỳ hiện tại)
  };
  const value = useMemo(() => ({ employeeIds, period, sub, setEmployeeIds, setPeriod, setSub }), [employeeIds, period, sub]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters() {
  const v = useContext(Ctx);
  if (!v) throw new Error("FilterProvider missing");
  return v;
}
