import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Download, FileSpreadsheet, Hourglass, Search, Trash2, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FilterBar } from "@/components/FilterBar";
import { RecordForm, emptyRecord, type FormValues } from "@/components/RecordForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useMe, type SalesRecord } from "@/lib/data";
import { useFilteredRecords } from "@/lib/use-filtered";
import {
  DEBT_STATUS_LABELS,
  NATURE_LABELS,
  daysOwed,
  debtWarning,
  formatDateVN,
  formatVND,
  netRevenue,
  companyRevenue,
  canWriteEmployeeRecord,
  remainingDebt,
  type DebtStatus,
  type Nature,
} from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/phieu")({
  head: () => ({
    meta: [
      { title: "Phiếu doanh số — Báo cáo Doanh số & Công nợ" },
      { name: "description", content: "Nhập liệu doanh số, công nợ và xuất báo cáo Excel." },
      { property: "og:title", content: "Phiếu doanh số — Báo cáo Doanh số & Công nợ" },
      { property: "og:description", content: "Nhập liệu doanh số, công nợ và xuất báo cáo Excel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PhieuPage,
});

function PhieuPage() {
  const qc = useQueryClient();
  const { canManage, canWrite, me, role } = useMe();
  const { filtered, employees, empMap, today } = useFilteredRecords();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<SalesRecord | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const writable = (r: SalesRecord) => canWriteEmployeeRecord(role, me?.employee?.id, r.employee_id);

  const myEmpId = me?.employee?.id ?? "";
  const formEmployees = canManage ? employees : employees.filter((e) => e.id === myEmpId);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return filtered;
    return filtered.filter((r) =>
      [r.voucher_no, r.customer, r.project, empMap.get(r.employee_id)?.full_name ?? ""].some((x) => x.toLowerCase().includes(s)),
    );
  }, [filtered, q, empMap]);
  const selectableRows = rows.filter(writable);
  const selectedIds = selectableRows.filter((r) => selected.includes(r.id)).map((r) => r.id);
  const allSelected = selectableRows.length > 0 && selectedIds.length === selectableRows.length;
  function selectRow(id: string, checked: boolean) {
    setSelected(checked ? [...new Set([...selectedIds, id])] : selectedIds.filter((x) => x !== id));
  }

  const refresh = () => qc.invalidateQueries({ queryKey: ["records"] });

  async function create(v: FormValues) {
    if (!canWrite) return false;
    const { error } = await supabase.from("sales_records").insert(v);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Số phiếu đã tồn tại" : error.message);
      return false;
    }
    toast.success("Thêm thành công!");
    refresh();
    return true;
  }
  async function update(v: FormValues) {
    if (!editing || !writable(editing)) return false;
    const { error } = await supabase.from("sales_records").update(v).eq("id", editing.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Đã cập nhật phiếu");
    setEditing(null);
    refresh();
    return true;
  }
  async function remove(id: string) {
    const record = filtered.find((r) => r.id === id);
    if (record && writable(record)) setDeleteIds([id]);
  }
  async function confirmDelete() {
    if (!deleteIds?.length || deleting) return;
    const ids = deleteIds.filter((id) => filtered.some((r) => r.id === id && writable(r)));
    if (!ids.length) { setDeleteIds(null); return; }
    setDeleting(true);
    try {
      const { data, error } = await supabase.from("sales_records").delete().in("id", ids).select("id");
      if (error) throw error;
      const deleted = new Set((data ?? []).map((r) => r.id));
      setSelected((previous) => previous.filter((id) => !deleted.has(id)));
      if (editing && deleted.has(editing.id)) setEditing(null);
      setDeleteIds(null);
      if (deleted.size === ids.length) toast.success(`Đã xóa ${deleted.size} phiếu`);
      else toast.warning(`Đã xóa ${deleted.size}/${ids.length} phiếu. Các phiếu còn lại không tồn tại hoặc bạn không có quyền xóa.`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa phiếu. Vui lòng thử lại.");
    } finally { setDeleting(false); }
  }

  async function exportFile(kind: "xlsx" | "csv") {
    const XLSX = await import("xlsx");
    const data = rows.map((r) => ({
      "Ngày": formatDateVN(r.record_date),
      "Số phiếu": r.voucher_no,
      "Nhân viên": empMap.get(r.employee_id)?.full_name ?? "",
      "Khách hàng": r.customer,
      "Công trình": r.project,
      "Tính chất": NATURE_LABELS[r.nature as Nature] ?? r.nature,
      "Doanh số tổng": r.gross,
      "Chiết khấu": r.discount,
      "Phụ kiện/DV": r.accessories,
      "Thuế GTGT": r.vat,
      "Hoa hồng KTS": r.kts_commission,
      "Chi phí CT": r.project_cost,
      "DT thuần nhân viên": netRevenue(r),
      "DT thuần công ty": companyRevenue(r),
      "Công nợ": r.gross,
      "Tiền cọc": r.deposit,
      "Công nợ còn lại": remainingDebt(r),
      "Hạn thanh toán": formatDateVN(r.due_date),
      "Trạng thái": DEBT_STATUS_LABELS[r.debt_status as DebtStatus] ?? r.debt_status,
      "Số ngày nợ": daysOwed(r, today) ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0] ?? { a: 1 }).map((k) => ({ wch: Math.max(12, k.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao cao");
    const d = today;
    const name = `Bao_Cao_Kinh_Doanh_${String(d.getDate()).padStart(2, "0")}_${String(d.getMonth() + 1).padStart(2, "0")}_${d.getFullYear()}`;
    XLSX.writeFile(wb, `${name}.${kind}`, { bookType: kind });
  }

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <h1 className="min-w-0 text-2xl font-semibold sm:text-3xl">Phiếu doanh số & công nợ</h1>
        <FilterBar />
      </div>
      <div className={`grid min-w-0 gap-6 ${canWrite ? "xl:grid-cols-[420px_minmax(0,1fr)]" : ""}`}>
        {canWrite && <div className="min-w-0 h-fit rounded-xl border bg-card p-4 shadow-card sm:p-5">
          <h2 className="mb-4 text-lg font-semibold">Nhập phiếu mới</h2>
          {formEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tài khoản của bạn chưa được liên kết với nhân viên. Liên hệ Admin.</p>
          ) : (
            <RecordForm
              initial={emptyRecord(canManage ? (formEmployees[0]?.id ?? "") : myEmpId)}
              employees={formEmployees}
              lockEmployee={!canManage}
              submitLabel="Ghi nhận dữ liệu"
              onSubmit={create}
            />
          )}
        </div>}

        <div className="min-w-0 rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-auto">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Tìm số phiếu, khách hàng, công trình..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => exportFile("xlsx")}><FileSpreadsheet className="h-4 w-4" /> Xuất Excel (.xlsx)</Button>
            <Button variant="outline" onClick={() => exportFile("csv")}><Download className="h-4 w-4" /> Xuất CSV</Button>
            {selectedIds.length > 0 && <Button variant="destructive" disabled={deleting} onClick={() => setDeleteIds([...selectedIds])}><Trash2 className="h-4 w-4" />Xóa các phiếu đã chọn ({selectedIds.length})</Button>}
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{rows.length} phiếu</p>
          <div className="min-w-0 max-w-full max-h-[70dvh] overflow-auto overscroll-x-contain" tabIndex={0} role="region" aria-label="Danh sách phiếu doanh số">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground">
                <tr>
                  {canWrite && <th className="py-2 pr-3"><Checkbox aria-label="Chọn tất cả phiếu" disabled={selectableRows.length === 0 || deleting} checked={allSelected ? true : selectedIds.length > 0 ? "indeterminate" : false} onCheckedChange={(checked) => setSelected(checked === true ? selectableRows.map((r) => r.id) : [])} /></th>}
                  <th className="py-2 pr-3">Cảnh báo</th><th className="pr-3">Ngày</th><th className="pr-3">Số phiếu</th><th className="pr-3">Nhân viên</th>
                  <th className="pr-3">Khách hàng</th><th className="pr-3 text-right">Doanh số</th><th className="pr-3 text-right">DT thuần NV</th><th className="pr-3 text-right">DT thuần CT</th>
                  <th className="pr-3 text-right">Còn lại</th><th className="pr-3">Trạng thái</th><th className="pr-3">Ngày nợ</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const w = debtWarning(r, today);
                  const days = daysOwed(r, today);
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/50">
                      {canWrite && <td className="py-2 pr-3"><Checkbox aria-label={`Chọn phiếu ${r.voucher_no}`} checked={selectedIds.includes(r.id)} disabled={!writable(r) || deleting} onCheckedChange={(checked) => selectRow(r.id, checked === true)} /></td>}
                      <td className="py-2 pr-3">
                        {w === "overdue" ? <TriangleAlert className="h-4 w-4 text-destructive" aria-label="Quá hạn" />
                          : w === "soon" ? <Hourglass className="h-4 w-4 text-warning" aria-label="Sắp đến hạn" />
                          : <CheckCircle2 className="h-4 w-4 text-success" aria-label="An toàn" />}
                      </td>
                      <td className="pr-3">{formatDateVN(r.record_date)}</td>
                      <td className="pr-3">
                        {writable(r) ? <Button variant="link" className="h-auto p-0" aria-label={`Sửa phiếu ${r.voucher_no}`} onClick={() => setEditing(r)}>{r.voucher_no}</Button> : <span className="font-medium">{r.voucher_no}</span>}
                      </td>
                      <td className="pr-3">{empMap.get(r.employee_id)?.full_name}</td>
                      <td className="pr-3">{r.customer}</td>
                      <td className="pr-3 text-right">{formatVND(r.gross)}</td>
                      <td className="pr-3 text-right">{formatVND(netRevenue(r))}</td>
                      <td className="pr-3 text-right">{formatVND(companyRevenue(r))}</td>
                      <td className="pr-3 text-right font-medium">{formatVND(remainingDebt(r))}</td>
                      <td className="pr-3">{DEBT_STATUS_LABELS[r.debt_status as DebtStatus]}</td>
                      <td className="pr-3">{days === null ? "—" : `${days} ngày`}</td>
                      <td>
                        {writable(r) && <Button size="icon" variant="ghost" disabled={deleting} onClick={() => remove(r.id)} aria-label="Xóa"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={canWrite ? 13 : 12} className="py-8 text-center text-muted-foreground">Không có dữ liệu.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteIds !== null} onOpenChange={(open) => { if (!open && !deleting) setDeleteIds(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Xóa {deleteIds?.length ?? 0} phiếu đã chọn?</AlertDialogTitle><AlertDialogDescription>Các phiếu sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel><Button variant="destructive" disabled={deleting} onClick={confirmDelete}><Trash2 className="h-4 w-4" />{deleting ? "Đang xóa..." : "Xác nhận xóa"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editing && writable(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-auto">
          <DialogHeader><DialogTitle>Chi tiết phiếu {editing?.voucher_no}</DialogTitle></DialogHeader>
          {editing && (
            <RecordForm
              key={editing.id}
              initial={editing}
              employees={canManage ? employees : formEmployees}
              lockEmployee={!canManage}
              submitLabel="Lưu thay đổi"
              onSubmit={update}
              onDelete={() => remove(editing.id)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
