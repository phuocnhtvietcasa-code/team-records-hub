import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useKpiTargets, useMe, type Employee } from "@/lib/data";
import { formatVND } from "@/lib/finance";
import { MoneyInput } from "@/components/MoneyInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TargetForm = { id?: string; employee_id: string | null; target_year: number; period: string; period_no: number; amount: number };
const periods: Record<string, string> = { month: "Tháng", quarter: "Quý", year: "Năm" };

export function KpiSettings({ employees }: { employees: Employee[] }) {
  const { isAdmin } = useMe();
  const { data: targets = [], isError } = useKpiTargets();
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [edit, setEdit] = useState<TargetForm | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["kpi-targets"] });
  async function save() {
    if (!edit || !isAdmin) return;
    setBusy(true);
    const { id, ...values } = edit;
    const { error } = id ? await supabase.from("kpi_targets").update(values).eq("id", id) : await supabase.from("kpi_targets").insert(values);
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "KPI kỳ này đã có. Hãy sửa mục tiêu hiện tại." : error.message); return; }
    setEdit(null);
    await refresh();
    toast.success("Đã lưu mục tiêu KPI");
  }
  return <section className="space-y-4 border-t pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold">Mục tiêu KPI cá nhân & Công ty</h2>
      <div className="flex items-center gap-2">
        <Input aria-label="Năm KPI" type="number" min={2000} max={2200} className="w-24" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        {isAdmin && <Button onClick={() => setEdit({ employee_id: null, target_year: year, period: "year", period_no: 1, amount: 0 })}><Plus className="h-4 w-4" /> Thêm KPI</Button>}
      </div>
    </div>
    {isError && <p className="text-destructive">Không tải được mục tiêu KPI.</p>}
    <div className="min-w-0 max-w-full overflow-auto overscroll-x-contain">
      <table className="w-full whitespace-nowrap text-sm">
        <thead className="bg-muted text-left text-xs text-muted-foreground"><tr><th className="p-3">Đối tượng</th><th>Kỳ</th><th className="text-right">Mục tiêu</th><th className="text-right">Thao tác</th></tr></thead>
        <tbody>{targets.filter((t) => t.target_year === year).map((t) => <tr className="border-t" key={t.id}>
          <td className="p-3 font-medium">{t.employee_id ? employees.find((e) => e.id === t.employee_id)?.full_name ?? "Nhân viên" : "Tổng công ty"}</td>
          <td>{periods[t.period]} {t.period === "year" ? t.target_year : `${t.period_no}/${t.target_year}`}</td>
          <td className="text-right font-semibold">{formatVND(t.amount)}</td>
          <td className="text-right">{isAdmin && <>
            <Button size="icon" variant="ghost" aria-label="Sửa KPI" onClick={() => setEdit(t)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" aria-label="Xóa KPI" onClick={async () => {
              if (!confirm("Xóa mục tiêu KPI này?")) return;
              const { error } = await supabase.from("kpi_targets").delete().eq("id", t.id);
              if (error) toast.error(error.message); else { await refresh(); toast.success("Đã xóa KPI"); }
            }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </>}</td>
        </tr>)}</tbody>
      </table>
      {!targets.some((t) => t.target_year === year) && <p className="py-5 text-center text-sm text-muted-foreground">Chưa cài đặt KPI riêng cho năm {year}.</p>}
    </div>
    <Dialog open={isAdmin && !!edit} onOpenChange={(open) => { if (!open) setEdit(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{edit?.id ? "Sửa mục tiêu KPI" : "Thêm mục tiêu KPI"}</DialogTitle></DialogHeader>
        {edit && <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="space-y-1"><Label>Đối tượng</Label><Select value={edit.employee_id ?? "company"} onValueChange={(v) => setEdit({ ...edit, employee_id: v === "company" ? null : v })}><SelectTrigger aria-label="Đối tượng KPI"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="company">Tổng công ty</SelectItem>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Năm</Label><Input aria-label="Năm mục tiêu" type="number" min={2000} max={2200} required value={edit.target_year} onChange={(e) => setEdit({ ...edit, target_year: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Kỳ mục tiêu</Label><Select value={edit.period} onValueChange={(period) => setEdit({ ...edit, period, period_no: 1 })}><SelectTrigger aria-label="Kỳ mục tiêu"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(periods).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          {edit.period !== "year" && <div className="space-y-1"><Label>{periods[edit.period]}</Label><Select value={String(edit.period_no)} onValueChange={(v) => setEdit({ ...edit, period_no: Number(v) })}><SelectTrigger aria-label="Số kỳ"><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: edit.period === "month" ? 12 : 4 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{periods[edit.period]} {i + 1}</SelectItem>)}</SelectContent></Select></div>}
          <div className="space-y-1"><Label>Mục tiêu (VNĐ)</Label><MoneyInput aria-label="Mục tiêu KPI" value={edit.amount} onValueChange={(amount) => setEdit({ ...edit, amount })} /></div>
          <Button disabled={busy} type="submit" className="w-full">{busy ? "Đang lưu..." : "Lưu KPI"}</Button>
        </form>}
      </DialogContent>
    </Dialog>
  </section>;
}