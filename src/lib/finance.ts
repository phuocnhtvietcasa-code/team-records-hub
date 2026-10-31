export type Nature = "ca_nhan" | "cong_ty";
export type DebtStatus =
  | "chua_thanh_toan"
  | "coc_30"
  | "coc_50"
  | "thanh_toan_1_phan"
  | "thanh_toan_du"
  | "thua_tien"
  | "dang_tru_coc";

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  chua_thanh_toan: "Chưa thanh toán",
  coc_30: "Cọc 30%",
  coc_50: "Cọc 50%",
  thanh_toan_1_phan: "Thanh toán 1 phần",
  thanh_toan_du: "Thanh toán đủ",
  thua_tien: "Thừa tiền",
  dang_tru_coc: "Đang trừ cọc",
};

export const NATURE_LABELS: Record<Nature, string> = { ca_nhan: "Cá nhân", cong_ty: "Công ty" };

export interface RecordAmounts {
  gross: number;
  discount: number;
  accessories: number;
  vat: number;
  kts_commission: number;
  project_cost: number;
  nature: string;
  deposit: number;
  payment_amount?: number;
  debt_status: string;
}

/** Net before allocation; debt continues to use gross. */
export function netBeforeAllocation(r: RecordAmounts): number {
  return r.gross - r.discount - r.accessories - r.vat - r.kts_commission - r.project_cost;
}
/** Employee share: all individual net, half company net. */
export function netRevenue(r: RecordAmounts): number {
  return netBeforeAllocation(r) * (r.nature === "cong_ty" ? 0.5 : 1);
}
/** Company share: the other half of company-nature net only. */
export function companyRevenue(r: RecordAmounts): number {
  return r.nature === "cong_ty" ? netBeforeAllocation(r) / 2 : 0;
}

/** Dashboard company total: full net before allocation of every record, individual and company alike. */
export function companyNet(r: RecordAmounts): number {
  return netBeforeAllocation(r);
}

export type KpiStatus = "missed" | "near" | "achieved";
export const KPI_STATUS_LABELS: Record<KpiStatus, string> = { missed: "Chưa đạt", near: "Sắp đạt", achieved: "Đã đạt" };
/** Dưới 70%: Chưa đạt · 70% đến dưới 100%: Sắp đạt · từ 100%: Đã đạt. */
export function kpiStatus(pct: number): KpiStatus {
  if (pct >= 100) return "achieved";
  if (pct >= 70) return "near";
  return "missed";
}

export function parseMoneyInput(value: string): number {
  return Number(value.replace(/\D/g, "")) || 0;
}
export function formatMoneyInput(value: string | number): string {
  const digits = String(value).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export interface KpiTarget {
  employee_id: string | null;
  target_year: number;
  period: string;
  period_no: number;
  amount: number;
}
/** Explicit month overrides quarter/3, which overrides year/12; legacy is last fallback. */
export function monthlyKpi(targets: KpiTarget[], employeeId: string | null, year: number, month: number, fallback = 0): number {
  const scoped = targets.filter((t) => t.employee_id === employeeId && t.target_year === year);
  const direct = scoped.find((t) => t.period === "month" && t.period_no === month);
  if (direct) return direct.amount;
  const quarter = scoped.find((t) => t.period === "quarter" && t.period_no === Math.ceil(month / 3));
  if (quarter) return quarter.amount / 3;
  const annual = scoped.find((t) => t.period === "year");
  return annual ? annual.amount / 12 : fallback;
}
export function periodKpi(targets: KpiTarget[], employeeId: string | null, p: Period, today: Date, fallback = 0, sub?: number | null): number {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  if (p === "week") return monthlyKpi(targets, employeeId, year, month, fallback) * (6 / 26);
  if (p === "month") return monthlyKpi(targets, employeeId, year, sub ?? month, fallback);
  const start = p === "quarter" ? ((sub ?? Math.floor((month - 1) / 3) + 1) - 1) * 3 + 1 : 1;
  const count = p === "quarter" ? 3 : 12;
  return Array.from({ length: count }, (_, i) => monthlyKpi(targets, employeeId, year, start + i, fallback)).reduce((sum, n) => sum + n, 0);
}

/** Chỉ Admin được Thêm/Sửa/Xóa trên toàn hệ thống. */
export function canWriteRecords(role: string): boolean {
  return role === "admin";
}

export interface TeamEmployee {
  id: string;
  team: string;
  team_role: string;
}
/** Dashboard scope: Admin/Quản lý xem toàn công ty; Nhân viên chỉ xem số liệu cá nhân. */
export function readableEmployees<T extends TeamEmployee>(employees: T[], role: string, own: TeamEmployee | null | undefined): T[] {
  if (role === "admin" || role === "manager") return employees;
  return employees.filter((e) => e.id === own?.id);
}
/** Records list scope: Admin xem tất cả; Quản lý xem phiếu của mình và nhân viên cùng team; Nhân viên chỉ xem phiếu của mình. */
export function recordScopeEmployees<T extends TeamEmployee>(employees: T[], role: string, own: TeamEmployee | null | undefined): T[] {
  if (role === "admin") return employees;
  if (role === "manager") {
    return employees.filter((e) => e.id === own?.id || (own != null && own.team.trim() !== "" && e.team === own.team));
  }
  return employees.filter((e) => e.id === own?.id);
}
export function selectedEmployees<T extends { id: string }>(employees: T[], ids: string[] | null): T[] {
  return ids === null ? employees : employees.filter((e) => ids.includes(e.id));
}
export function canWriteEmployeeRecord(role: string, ownId: string | undefined, employeeId: string): boolean {
  return role === "admin";
}
export const COST_FIELDS = [
  { key: "discount", label: "Chiết khấu bán hàng" },
  { key: "accessories", label: "Tiền phụ kiện/dịch vụ" },
  { key: "vat", label: "Thuế GTGT" },
  { key: "kts_commission", label: "Hoa hồng KTS" },
  { key: "project_cost", label: "Chi phí công trình" },
] as const;
export function costBreakdown(records: RecordAmounts[]) {
  const gross = records.reduce((sum, r) => sum + r.gross, 0);
  const items = COST_FIELDS.map(({ key, label }) => {
    const amount = records.reduce((sum, r) => sum + r[key], 0);
    return { key, label, amount, pct: gross > 0 ? amount / gross * 100 : 0 };
  });
  return { gross, items, total: items.reduce((sum, item) => sum + item.amount, 0) };
}

/** Công nợ = Doanh số tổng − Chiết khấu bán hàng + Thuế GTGT. */
export function debtAmount(r: Pick<RecordAmounts, "gross" | "discount" | "vat">): number {
  return r.gross - r.discount + r.vat;
}

/** Công nợ còn lại = Công nợ − Tiền cọc − Số tiền thanh toán; thanh toán đủ luôn bằng 0. */
export function remainingDebt(r: Pick<RecordAmounts, "gross" | "discount" | "vat" | "deposit" | "payment_amount" | "debt_status">): number {
  return r.debt_status === "thanh_toan_du" ? 0 : debtAmount(r) - r.deposit - (r.payment_amount ?? 0);
}

export function grossPercentage(amount: number, gross: number): number {
  return gross > 0 ? amount / gross * 100 : 0;
}

export function isFullyPaid(r: Pick<RecordAmounts, "debt_status">): boolean {
  return r.debt_status === "thanh_toan_du" || r.debt_status === "thua_tien";
}

/** Số tiền còn phải thu thực tế (không âm, 0 nếu đã thanh toán đủ). Giữ nguyên công thức gốc, tách biệt khỏi Công nợ còn lại của form. */
export function outstanding(r: Pick<RecordAmounts, "gross" | "deposit" | "debt_status">): number {
  if (isFullyPaid(r)) return 0;
  return Math.max(r.gross - r.deposit, 0);
}

export function collected(r: Pick<RecordAmounts, "gross" | "deposit" | "debt_status">): number {
  return r.gross - outstanding(r);
}

const DAY = 86_400_000;
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function parseDate(s: string): Date {
  const [y = 1970, m = 1, d = 1] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY);
}

export type Warning = "overdue" | "soon" | "safe";

/** Quá hạn nếu hạn < hôm nay; sắp đến hạn nếu còn ≤ 7 ngày; an toàn nếu đã thu hoặc còn xa. */
export function debtWarning(
  r: Pick<RecordAmounts, "gross" | "deposit" | "debt_status"> & { due_date: string },
  today: Date,
): Warning {
  if (outstanding(r) <= 0) return "safe";
  const left = daysBetween(today, parseDate(r.due_date));
  if (left < 0) return "overdue";
  if (left < 7) return "soon";
  return "safe";
}

/** Số ngày nợ tính từ ngày lập phiếu; null khi đã thanh toán đủ. */
export function daysOwed(
  r: Pick<RecordAmounts, "gross" | "deposit" | "debt_status"> & { record_date: string },
  today: Date,
): number | null {
  if (outstanding(r) <= 0) return null;
  return Math.max(daysBetween(parseDate(r.record_date), today), 0);
}

export type Period = "week" | "month" | "quarter" | "year" | "all";
export const PERIOD_LABELS: Record<Period, string> = {
  week: "Tuần này",
  month: "Tháng này",
  quarter: "Quý này",
  year: "Năm nay",
  all: "Tất cả",
};

export function periodStart(p: Period, today: Date): Date | null {
  const t = startOfDay(today);
  switch (p) {
    case "week": {
      const dow = (t.getDay() + 6) % 7; // Monday = 0
      return new Date(t.getTime() - dow * DAY);
    }
    case "month":
      return new Date(t.getFullYear(), t.getMonth(), 1);
    case "quarter":
      return new Date(t.getFullYear(), Math.floor(t.getMonth() / 3) * 3, 1);
    case "year":
      return new Date(t.getFullYear(), 0, 1);
    default:
      return null;
  }
}

export interface PeriodRange {
  start: Date;
  end: Date;
}

/** Số tuần trong tháng (mỗi tuần 7 ngày: 1–7, 8–14, 15–21, 22–hết tháng). */
export function monthWeekCount(today: Date): number {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Math.ceil(lastDay / 7);
}

/** Tuần (1-based) của ngày `today` trong tháng. */
export function currentMonthWeek(today: Date): number {
  return Math.ceil(today.getDate() / 7);
}

/** Khoảng ngày của kỳ đang chọn; `sub` = tuần trong tháng / tháng trong năm / quý (1-based), null = kỳ hiện tại. */
export function periodRange(p: Period, today: Date, sub?: number | null): PeriodRange | null {
  const t = startOfDay(today);
  const y = t.getFullYear();
  if (p === "week") {
    if (sub == null) {
      const dow = (t.getDay() + 6) % 7;
      const mon = new Date(t.getTime() - dow * DAY);
      return { start: mon, end: new Date(mon.getTime() + 5 * DAY) };
    }
    const first = (sub - 1) * 7 + 1;
    const lastDay = new Date(y, t.getMonth() + 1, 0).getDate();
    const last = Math.min(sub * 7, lastDay);
    return { start: new Date(y, t.getMonth(), first), end: new Date(y, t.getMonth(), last) };
  }
  if (p === "month") {
    const m = sub == null ? t.getMonth() : sub - 1;
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
  }
  if (p === "quarter") {
    const q = sub == null ? Math.floor(t.getMonth() / 3) + 1 : sub;
    const firstMonth = (q - 1) * 3;
    return { start: new Date(y, firstMonth, 1), end: new Date(y, firstMonth + 3, 0) };
  }
  if (p === "year") return { start: new Date(y, 0, 1), end: t };
  return null;
}

export function inPeriod(dateStr: string, p: Period, today: Date, sub?: number | null): boolean {
  const range = periodRange(p, today, sub);
  if (!range) return true;
  const d = parseDate(dateStr);
  if (p === "week" && d.getDay() === 0) return false; // Tuần làm việc: Thứ 2 → Thứ 7, không tính Chủ nhật
  const t = startOfDay(today);
  const end = p === "week" ? range.end : range.end > t ? t : range.end;
  return d >= range.start && d <= end;
}

/** Hệ số tháng để quy đổi mục tiêu tháng sang kỳ đang lọc. */
export function targetMonths(p: Period, today: Date): number {
  switch (p) {
    case "week":
      return 6 / 26;
    case "month":
      return 1;
    case "quarter":
      return (today.getMonth() % 3) + 1;
    default:
      return today.getMonth() + 1;
  }
}

export function formatVND(n: number): string {
  return `${Math.round(n).toLocaleString("vi-VN")} đ`;
}
export function formatDateVN(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

/** Các ngày làm việc (bỏ Chủ nhật) của tuần đang chọn, dạng yyyy-mm-dd. */
export function weekDays(today: Date, sub?: number | null): string[] {
  const range = periodRange("week", today, sub);
  if (!range) return [];
  const days: string[] = [];
  for (let t = range.start.getTime(); t <= range.end.getTime(); t += DAY) {
    const d = new Date(t);
    if (d.getDay() === 0) continue;
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return days;
}

export type AgingBucket = "0-30" | "31-60" | ">60";
export function agingBucket(days: number): AgingBucket {
  return days <= 30 ? "0-30" : days <= 60 ? "31-60" : ">60";
}
