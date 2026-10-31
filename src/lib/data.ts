import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { canWriteRecords } from "./finance";

export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type SalesRecord = Database["public"]["Tables"]["sales_records"]["Row"];
export type SalesRecordInsert = Database["public"]["Tables"]["sales_records"]["Insert"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  manager: "Quản lý",
  staff: "Nhân viên",
};

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const user = u.user;
    if (!user) return null;
    const [{ data: roles }, { data: emp }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("employees").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    const r = (roles ?? []).map((x) => x.role);
    const role: AppRole = r.includes("admin") ? "admin" : r.includes("manager") ? "manager" : "staff";
    return { id: user.id, email: user.email ?? "", role, employee: emp as Employee | null };
  },
});

export function useMe() {
  const { data } = useSuspenseQuery(meQuery);
  const role = data?.role ?? "staff";
  return {
    me: data,
    role,
    isAdmin: role === "admin",
    canManage: role === "admin" || role === "manager",
    canWrite: canWriteRecords(role),
  };
}

export const employeesQuery = queryOptions({
  queryKey: ["employees"],
  queryFn: async () => {
    const { data, error } = await supabase.from("employees").select("*").order("code");
    if (error) throw error;
    return data;
  },
});

export const recordsQuery = queryOptions({
  queryKey: ["records"],
  queryFn: async () => {
    const all: SalesRecord[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("sales_records")
        .select("*")
        .order("record_date", { ascending: false })
        .range(from, from + 999);
      if (error) throw error;
      all.push(...data);
      if (data.length < 1000) break;
    }
    return all;
  },
});

export function useEmployees() {
  return useQuery(employeesQuery);
}
export function useRecords() {
  return useQuery(recordsQuery);
}

export const kpiTargetsQuery = queryOptions({
  queryKey: ["kpi-targets"],
  queryFn: async () => {
    const { data, error } = await supabase.from("kpi_targets").select("*").order("target_year", { ascending: false });
    if (error) throw error;
    return data;
  },
});
export function useKpiTargets() {
  return useQuery(kpiTargetsQuery);
}
