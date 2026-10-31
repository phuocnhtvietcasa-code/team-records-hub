import { useMemo } from "react";
import { useFilters } from "./filters";
import { useEmployees, useMe, useRecords } from "./data";
import { inPeriod, readableEmployees, recordScopeEmployees, selectedEmployees } from "./finance";

export function useToday() {
  return useMemo(() => new Date(), []);
}

export function useFilteredRecords() {
  const { employeeIds, period, sub } = useFilters();
  const { role, me } = useMe();
  const records = useRecords();
  const employees = useEmployees();
  const today = useToday();
  const availableEmployees = useMemo(() => readableEmployees(employees.data ?? [], role, me?.employee), [employees.data, role, me?.employee]);
  const scope = useMemo(() => selectedEmployees(availableEmployees, employeeIds), [availableEmployees, employeeIds]);
  const filtered = useMemo(
    () =>
      (records.data ?? []).filter(
        (r) => scope.some((e) => e.id === r.employee_id) && inPeriod(r.record_date, period, today, sub),
      ),
    [records.data, scope, period, sub, today],
  );
  // Phạm vi trang Phiếu: Admin xem tất cả; Quản lý xem team mình; Nhân viên chỉ xem phiếu của mình.
  const listEmployees = useMemo(() => recordScopeEmployees(employees.data ?? [], role, me?.employee), [employees.data, role, me?.employee]);
  const listScope = useMemo(() => selectedEmployees(listEmployees, employeeIds), [listEmployees, employeeIds]);
  const listFiltered = useMemo(
    () =>
      (records.data ?? []).filter(
        (r) => listScope.some((e) => e.id === r.employee_id) && inPeriod(r.record_date, period, today, sub),
      ),
    [records.data, listScope, period, sub, today],
  );
  const empMap = useMemo(() => new Map((employees.data ?? []).map((e) => [e.id, e])), [employees.data]);
  return {
    filtered,
    scope,
    availableEmployees,
    listEmployees,
    listScope,
    listFiltered,
    employees: employees.data ?? [],
    empMap,
    today,
    loading: records.isLoading || employees.isLoading,
  };
}
