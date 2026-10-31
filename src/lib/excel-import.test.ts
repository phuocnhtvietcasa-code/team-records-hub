import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createSalesTemplate, EXCEL_COLUMNS, parseSalesWorkbook } from "./excel-import";

const employees = [{ id: "employee-1", code: "NV01", full_name: "Nguyễn An" }];
const valid = ["QA-EXCEL", "27/10/2026", "NV01", "Khách Excel", "Công trình A", 100000000, 1000000, 2000000, 3000000, 4000000, 5000000, "Công ty", "27/11/2026", 30000000, "Cọc 30%"];
function workbook(rows: unknown[][], type: "xlsx" | "biff8" = "xlsx"): ArrayBuffer {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), "Data");
  return XLSX.write(book, { type: "array", bookType: type });
}
const headers = EXCEL_COLUMNS.map(([, label]) => label);

describe("Excel sales import", () => {
  it("includes every editable sales field in its one-sheet template", () => {
    const template = createSalesTemplate();
    expect(template.SheetNames).toHaveLength(1);
    const first = template.SheetNames[0];
    if (!first) throw new Error("Template sheet missing");
    const sheet = template.Sheets[first];
    if (!sheet) throw new Error("Template sheet missing");
    expect(XLSX.utils.sheet_to_json(sheet, { header: 1 })[0]).toEqual(headers);
    expect(EXCEL_COLUMNS.map(([key]) => key)).toEqual(["voucher_no", "record_date", "employee_id", "customer", "project", "gross", "discount", "accessories", "vat", "kts_commission", "project_cost", "nature", "due_date", "deposit", "debt_status"]);
  });
  it.each(["xlsx", "biff8"] as const)("parses %s from the first sheet into complete insert values", (type) => {
    expect(parseSalesWorkbook(workbook([headers, valid], type), employees)[0]).toEqual({
      voucher_no: "QA-EXCEL", record_date: "2026-10-27", employee_id: "employee-1", customer: "Khách Excel", project: "Công trình A",
      gross: 100000000, discount: 1000000, accessories: 2000000, vat: 3000000, kts_commission: 4000000, project_cost: 5000000,
      nature: "cong_ty", due_date: "2026-11-27", deposit: 30000000, debt_status: "coc_30",
    });
  });
  it("rejects missing headers", () => {
    expect(() => parseSalesWorkbook(workbook([headers.slice(1), valid.slice(1)]), employees)).toThrow("Thiếu cột: Mã phiếu");
  });
  it("rejects duplicate vouchers before any persistence", () => {
    expect(() => parseSalesWorkbook(workbook([headers, valid, valid]), employees)).toThrow("Dòng 3");
    expect(() => parseSalesWorkbook(workbook([headers, valid]), employees, ["QA-EXCEL"])).toThrow("đã tồn tại");
  });
  it("rejects unknown employees and invalid dates, enums and amounts", () => {
    for (const [column, value] of [[2, "Không tồn tại"], [1, "31/02/2026"], [5, -1], [5, "abc"], [11, "Sai"], [14, "Sai"]] as const) {
      const row = [...valid]; row[column] = value;
      expect(() => parseSalesWorkbook(workbook([headers, row]), employees)).toThrow("Dòng 2");
    }
  });
  it("accepts reordered headers, Excel dates and formatted VND", () => {
    const row = [...valid]; row[1] = 46322; row[5] = "100.000.000 đ";
    const records = parseSalesWorkbook(workbook([[...headers].reverse(), row.reverse()]), employees);
    expect(records[0]?.record_date).toBe("2026-10-27");
    expect(records[0]?.gross).toBe(100000000);
  });
  it("rejects an empty template", () => {
    expect(() => parseSalesWorkbook(workbook([headers]), employees)).toThrow("chưa có dữ liệu");
  });
});