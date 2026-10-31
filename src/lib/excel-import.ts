import * as XLSX from "xlsx";
import type { Employee, SalesRecordInsert } from "./data";
import { DEBT_STATUS_LABELS, NATURE_LABELS } from "./finance";

export const EXCEL_COLUMNS = [
  ["voucher_no", "Mã phiếu"], ["record_date", "Ngày ghi nhận"],
  ["employee_id", "Nhân viên"], ["customer", "Khách hàng"], ["project", "Công trình"],
  ["gross", "Doanh thu gốc"], ["discount", "Chiết khấu bán hàng"],
  ["accessories", "Tiền phụ kiện/dịch vụ"], ["vat", "Thuế GTGT"],
  ["kts_commission", "Hoa hồng KTS"], ["project_cost", "Chi phí công trình"],
  ["nature", "Tính chất"], ["due_date", "Hạn thanh toán"],
  ["deposit", "Tiền cọc"], ["debt_status", "Trạng thái công nợ"],
] as const;

export function createSalesTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([EXCEL_COLUMNS.map(([, label]) => label)]);
  sheet["!cols"] = EXCEL_COLUMNS.map(([, label]) => ({ wch: Math.max(22, label.length + 2) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Phiếu doanh số");
  return book;
}

const normalize = (value: unknown) => String(value ?? "").trim().normalize("NFC").toLocaleLowerCase("vi-VN");
const text = (value: unknown) => String(value ?? "").trim();

function dateValue(value: unknown): string {
  let year = 0, month = 0, day = 0;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) { year = parsed.y; month = parsed.m; day = parsed.d; }
  } else {
    const valueText = text(value);
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(valueText);
    const vn = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(valueText);
    if (iso) { year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]); }
    else if (vn) { year = Number(vn[3]); month = Number(vn[2]); day = Number(vn[1]); }
  }
  const date = new Date(year, month - 1, day);
  if (year < 1900 || year > 9999 || date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    throw new Error("Ngày không hợp lệ; dùng ngày Excel, DD/MM/YYYY hoặc YYYY-MM-DD");
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function moneyValue(value: unknown, required = false): number {
  if (text(value) === "") {
    if (required) throw new Error("Doanh thu gốc không được để trống");
    return 0;
  }
  const raw = text(value).replace(/\s/g, "").replace(/(?:đ|vnd)$/i, "");
  const amount = typeof value === "number" ? value : /^\d{1,3}(?:[.,]\d{3})+$/.test(raw) ? Number(raw.replace(/[.,]/g, "")) : /^\d+(?:[.,]\d{1,2})?$/.test(raw) ? Number(raw.replace(",", ".")) : NaN;
  if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER) throw new Error("Số tiền phải là số không âm hợp lệ");
  return amount;
}

function enumValue(value: unknown, labels: Record<string, string>): string {
  const entry = Object.entries(labels).find(([key, label]) => normalize(value) === normalize(key) || normalize(value) === normalize(label));
  if (!entry) throw new Error(`Giá trị phải là: ${Object.values(labels).join(", ")}`);
  return entry[0];
}

export function parseSalesWorkbook(buffer: ArrayBuffer, employees: Pick<Employee, "id" | "code" | "full_name">[], existingVouchers: string[] = []): SalesRecordInsert[] {
  const book = XLSX.read(buffer, { type: "array", cellDates: false });
  const first = book.SheetNames[0];
  const sheet = first ? book.Sheets[first] : undefined;
  if (!sheet) throw new Error("Tệp không có trang tính");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: true });
  const headers = rows[0]?.map(normalize) ?? [];
  const missing = EXCEL_COLUMNS.filter(([, label]) => !headers.includes(normalize(label)));
  if (missing.length) throw new Error(`Thiếu cột: ${missing.map(([, label]) => label).join(", ")}`);
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw new Error("Tiêu đề cột bị trùng");
  const seen = new Set(existingVouchers.map(normalize));
  const records: SalesRecordInsert[] = [];
  rows.slice(1).forEach((row, index) => {
    if (row.every((value) => text(value) === "")) return;
    const values = Object.fromEntries(EXCEL_COLUMNS.map(([key, label]) => [key, row[headers.indexOf(normalize(label))]]));
    try {
      const voucher = text(values["voucher_no"]);
      if (!/^[A-Za-z0-9\-_/]+$/.test(voucher)) throw new Error("Mã phiếu không hợp lệ");
      if (seen.has(normalize(voucher))) throw new Error(`Mã phiếu ${voucher} đã tồn tại hoặc bị trùng trong tệp`);
      const identity = normalize(values["employee_id"]);
      const byCode = employees.filter((e) => normalize(e.code) === identity);
      const matches = byCode.length ? byCode : employees.filter((e) => normalize(e.full_name) === identity);
      const employee = matches[0];
      if (!identity || matches.length !== 1 || !employee) throw new Error("Nhân viên không tồn tại hoặc trùng tên; hãy dùng mã nhân viên");
      if (!text(values["customer"])) throw new Error("Khách hàng không được để trống");
      const amounts = Object.fromEntries(["gross", "discount", "accessories", "vat", "kts_commission", "project_cost", "deposit"].map((key) => [key, moneyValue(values[key], key === "gross")]));
      records.push({
        voucher_no: voucher, employee_id: employee.id, customer: text(values["customer"]), project: text(values["project"]),
        record_date: dateValue(values["record_date"]), due_date: dateValue(values["due_date"]),
        nature: enumValue(values["nature"], NATURE_LABELS), debt_status: enumValue(values["debt_status"], DEBT_STATUS_LABELS),
        ...amounts,
      });
      seen.add(normalize(voucher));
    } catch (error) {
      throw new Error(`Dòng ${index + 2}: ${error instanceof Error ? error.message : "Dữ liệu không hợp lệ"}`);
    }
  });
  if (!records.length) throw new Error("Tệp chưa có dữ liệu phiếu");
  return records;
}