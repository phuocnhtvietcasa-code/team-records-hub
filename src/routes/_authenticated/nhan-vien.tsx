import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiSettings } from "@/components/KpiSettings";
import { MoneyInput } from "@/components/MoneyInput";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS, useEmployees, useMe, type AppRole, type Employee } from "@/lib/data";
import { formatVND } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/nhan-vien")({
  head: () => ({
    meta: [
      { title: "Nhân viên — Báo cáo Doanh số & Công nợ" },
      { name: "description", content: "Quản lý nhân viên, mục tiêu và phân quyền tài khoản." },
      { property: "og:title", content: "Nhân viên — Báo cáo Doanh số & Công nợ" },
      { property: "og:description", content: "Quản lý nhân viên, mục tiêu và phân quyền tài khoản." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmployeesPage,
});

type EmpForm = Pick<Employee, "code" | "full_name" | "department" | "position" | "monthly_target" | "team" | "team_role">;
const blank: EmpForm = { code: "", full_name: "", department: "Kinh doanh", position: "Nhân viên", monthly_target: 300_000_000, team: "", team_role: "member" };

function EmployeesPage() {
  const { isAdmin } = useMe();
  const { data: employees = [] } = useEmployees();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<{ id?: string; v: EmpForm } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    // KPI targets have no cascade from employees; clear them first, records cascade automatically.
    await supabase.from("kpi_targets").delete().eq("employee_id", deleteTarget.id);
    const { error } = await supabase.from("employees").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Đã xóa nhân viên ${deleteTarget.full_name}`);
    setDeleteTarget(null);
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["records"] });
    qc.invalidateQueries({ queryKey: ["kpi-targets"] });
  }

  async function save() {
    if (!edit || !isAdmin) return;
    const values = { ...edit.v, team: edit.v.team.trim() };
    const q = edit.id
      ? supabase.from("employees").update(values).eq("id", edit.id)
      : supabase.from("employees").insert(values);
    const { error } = await q;
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Mã nhân viên đã tồn tại" : error.message);
      return;
    }
    toast.success(edit.id ? "Đã cập nhật nhân viên" : "Đã thêm nhân viên");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["records"] });
    qc.invalidateQueries({ queryKey: ["kpi-targets"] });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:justify-between">
        <h1 className="min-w-0 text-2xl font-semibold sm:text-3xl">Nhân viên</h1>
        {isAdmin && (
          <Button onClick={() => setEdit({ v: { ...blank, code: `NV${String(employees.length + 1).padStart(3, "0")}` } })}>
            <Plus className="h-4 w-4" /> Thêm nhân viên
          </Button>
        )}
      </div>

      <div className="min-w-0 max-w-full overflow-auto overscroll-x-contain rounded-xl border bg-card shadow-card" tabIndex={0} role="region" aria-label="Danh sách nhân viên">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Mã NV</th><th>Họ và tên</th><th>Phòng ban</th><th>Chức vụ</th><th className="px-3">Team</th><th className="pr-3">Team Role</th><th className="text-right">Mục tiêu tháng</th><th>Tài khoản</th><th></th></tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-3 font-medium">{e.code}</td>
                <td>{e.full_name}</td>
                <td>{e.department}</td>
                <td>{e.position}</td>
                <td className="px-3">{e.team || "—"}</td>
                <td className="pr-3 whitespace-nowrap">{e.team_role === "leader" ? "Trưởng nhóm" : "Thành viên"}</td>
                <td className="text-right">{formatVND(e.monthly_target)}</td>
                <td className="pl-4 text-xs text-muted-foreground">{e.user_id ? "Đã liên kết" : "—"}</td>
                <td className="pr-3 text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" aria-label="Sửa" onClick={() => setEdit({ id: e.id, v: { code: e.code, full_name: e.full_name, department: e.department, position: e.position, monthly_target: e.monthly_target, team: e.team, team_role: e.team_role } })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Xóa" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(e)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <KpiSettings employees={employees} />
      {isAdmin && <UserRoles employees={employees} />}

      <Dialog open={isAdmin && !!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Sửa nhân viên" : "Thêm nhân viên"}</DialogTitle></DialogHeader>
          {edit && (
            <form className="space-y-3" onSubmit={(ev) => { ev.preventDefault(); save(); }}>
              {([["code", "Mã nhân viên"], ["full_name", "Họ và tên"], ["department", "Phòng ban"], ["position", "Chức vụ"]] as const).map(([k, l]) => (
                <div key={k} className="space-y-1">
                  <Label>{l}</Label>
                  <Input required value={edit.v[k]} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, [k]: e.target.value } })} />
                </div>
              ))}
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label htmlFor="employee-team">Team (Tên nhóm)</Label><Input id="employee-team" value={edit.v.team} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, team: e.target.value } })} /></div>
                <div className="space-y-1"><Label htmlFor="employee-team-role">Team Role</Label><Select value={edit.v.team_role} onValueChange={(team_role) => setEdit({ ...edit, v: { ...edit.v, team_role } })}><SelectTrigger id="employee-team-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="member">Thành viên</SelectItem><SelectItem value="leader">Trưởng nhóm</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-1">
                <Label>Mục tiêu tháng (VNĐ)</Label>
                <MoneyInput value={edit.v.monthly_target} onValueChange={(amount) => setEdit({ ...edit, v: { ...edit.v, monthly_target: amount } })} />
              </div>
              <Button type="submit" className="w-full">Lưu</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa nhân viên này không?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `${deleteTarget.full_name}${deleteTarget.user_id ? " (đã liên kết tài khoản)" : ""}: toàn bộ phiếu doanh số và mục tiêu KPI của nhân viên này cũng sẽ bị xóa. Hành động này không thể hoàn tác.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={confirmDelete}><Trash2 className="h-4 w-4" />{deleting ? "Đang xóa..." : "Xóa nhân viên"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserRoles({ employees }: { employees: Employee[] }) {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data;
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <h2 className="mb-1 text-lg font-semibold">Tài khoản & phân quyền</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Admin: toàn quyền · Quản lý: chỉ xem toàn bộ dữ liệu · Nhân viên: chỉ phiếu của mình (cần liên kết hồ sơ nhân viên).
      </p>
      <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain" tabIndex={0} role="region" aria-label="Tài khoản và phân quyền">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Email</th><th>Vai trò</th><th>Hồ sơ nhân viên</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.user_id} className="border-t">
              <td className="py-2">{u.email}</td>
              <td className="py-2 pr-3">
                <Select
                  value={u.role ?? "staff"}
                  onValueChange={async (r) => {
                    const { error } = await supabase.rpc("admin_set_role", { _user_id: u.user_id, _role: r as AppRole });
                    if (error) toast.error(error.message); else { toast.success("Đã đổi vai trò"); refresh(); }
                  }}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-2">
                <Select
                  value={u.employee_id ?? "none"}
                  onValueChange={async (eid) => {
                    const { error } = await supabase.rpc("admin_link_employee", { _user_id: u.user_id, _employee_id: (eid === "none" ? null : eid) as string });
                    if (error) toast.error(error.message); else { toast.success("Đã liên kết"); refresh(); }
                  }}
                >
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Chưa liên kết —</SelectItem>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
