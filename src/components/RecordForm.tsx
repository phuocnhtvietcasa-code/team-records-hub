import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/MoneyInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEBT_STATUS_LABELS,
  NATURE_LABELS,
  debtAmount,
  formatVND,
  formCompanyNet,
  formEmployeeNet,
  remainingDebt,
  toISODate,
} from "@/lib/finance";
import type { Employee, SalesRecord, SalesRecordInsert } from "@/lib/data";

export type FormValues = Omit<SalesRecordInsert, "id" | "created_at" | "created_by">;

export function emptyRecord(employeeId: string): FormValues {
  const today = new Date();
  const due = new Date(today.getTime() + 30 * 86_400_000);
  return {
    record_date: toISODate(today),
    voucher_no: "",
    employee_id: employeeId,
    customer: "",
    project: "",
    gross: 0,
    discount: 0,
    accessories: 0,
    vat: 0,
    kts_commission: 0,
    project_cost: 0,
    nature: "ca_nhan",
    deposit: 0,
    payment_amount: 0,
    due_date: toISODate(due),
    debt_status: "chua_thanh_toan",
  };
}

const MONEY: [keyof FormValues, string][] = [
  ["gross", "Doanh số tổng"],
  ["discount", "Chiết khấu bán hàng"],
  ["accessories", "Tiền phụ kiện / Dịch vụ"],
  ["vat", "Thuế GTGT"],
  ["kts_commission", "Hoa hồng KTS"],
  ["project_cost", "Chi phí công trình"],
];

export function RecordForm({
  initial,
  employees,
  lockEmployee,
  submitLabel,
  onSubmit,
  onDelete,
  readOnly = false,
}: {
  initial: FormValues | SalesRecord;
  employees: Employee[];
  lockEmployee?: boolean;
  submitLabel: string;
  onSubmit: (v: FormValues) => Promise<boolean>;
  onDelete?: () => void;
  readOnly?: boolean;
}) {
  const [v, setV] = useState<FormValues>(() => {
    const { id: _i, created_at: _c, created_by: _b, ...rest } = initial as SalesRecord;
    return rest as FormValues;
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormValues>(k: K, val: FormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const n = (k: keyof FormValues) => Number(v[k] ?? 0);
  const amounts = {
    gross: n("gross"), discount: n("discount"), accessories: n("accessories"), vat: n("vat"),
    kts_commission: n("kts_commission"), project_cost: n("project_cost"), nature: v.nature ?? "ca_nhan",
      deposit: n("deposit"), payment_amount: n("payment_amount"), debt_status: v.debt_status ?? "chua_thanh_toan",
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await onSubmit(v);
        setBusy(false);
        if (ok && !onDelete) setV(emptyRecord(v.employee_id));
      }}
    >
      <fieldset disabled={readOnly} className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Field label="Ngày ghi nhận">
          <Input type="date" required value={v.record_date ?? ""} onChange={(e) => set("record_date", e.target.value)} />
        </Field>
        <Field label="Số phiếu">
          <Input required pattern="[A-Za-z0-9\-_/]+" value={v.voucher_no} onChange={(e) => set("voucher_no", e.target.value)} />
        </Field>
        <Field label="Nhân viên">
          <Select value={v.employee_id} onValueChange={(x) => set("employee_id", x)} disabled={!!lockEmployee}>
            <SelectTrigger><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tính chất">
          <Select value={v.nature ?? "ca_nhan"} onValueChange={(x) => set("nature", x)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(NATURE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tên khách hàng">
          <Input required value={v.customer} onChange={(e) => set("customer", e.target.value)} />
        </Field>
        <Field label="Công trình">
          <Input value={v.project} onChange={(e) => set("project", e.target.value)} />
        </Field>
        {MONEY.map(([k, label]) => (
          <Field key={k} label={label}>
            <MoneyInput aria-label={label} value={Number(v[k] ?? 0)} onValueChange={(amount) => set(k, amount as never)} />
          </Field>
        ))}
        <Field label="Tiền cọc">
          <MoneyInput aria-label="Tiền cọc" value={Number(v.deposit ?? 0)} onValueChange={(amount) => set("deposit", amount)} />
        </Field>
        <Field label="Số tiền thanh toán">
          <MoneyInput aria-label="Số tiền thanh toán" value={Number(v.payment_amount ?? 0)} onValueChange={(amount) => set("payment_amount", amount)} />
        </Field>
        <Field label="Hạn thanh toán">
          <Input type="date" required value={v.due_date ?? ""} onChange={(e) => set("due_date", e.target.value)} />
        </Field>
        <Field label="Trạng thái công nợ" className="sm:col-span-2">
          <Select value={v.debt_status ?? "chua_thanh_toan"} onValueChange={(x) => set("debt_status", x)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DEBT_STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </fieldset>

      <div className="grid min-w-0 gap-3 rounded-lg bg-secondary p-3 text-sm sm:grid-cols-2">
        <Calc label="DT thuần nhân viên" value={formatVND(formEmployeeNet(amounts))} />
        <Calc label="DT thuần công ty" value={formatVND(formCompanyNet(amounts))} />
        <Calc label="Công nợ" value={formatVND(debtAmount(amounts))} />
        <Calc label="Công nợ còn lại" value={formatVND(remainingDebt(amounts))} />
      </div>

      {!readOnly && <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={busy || !v.employee_id}>{busy ? "Đang lưu..." : submitLabel}</Button>
        {onDelete && <Button type="button" variant="destructive" onClick={onDelete}>Xóa</Button>}
      </div>}
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 space-y-1 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
function Calc({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words font-semibold text-secondary-foreground">{value}</p>
    </div>
  );
}
