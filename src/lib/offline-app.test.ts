import { describe, expect, it } from "vitest";
import { buildOfflineAppHtml } from "./offline-app";

const sample = {
  employees: [
    { id: "e1", code: "NV01", full_name: "Nguyễn <An>", team: "A", team_role: "leader", department: "", position: "", monthly_target: 0, user_id: null, created_at: "" },
  ],
  records: [
    { id: "r1", record_date: "2026-10-20", voucher_no: "P001", employee_id: "e1", customer: "Khách A", project: "CT1", gross: 100_000_000, discount: 5_000_000, accessories: 0, vat: 8_000_000, kts_commission: 0, project_cost: 0, nature: "ca_nhan", deposit: 30_000_000, due_date: "2026-11-20", debt_status: "coc_30", created_at: "", created_by: null },
  ],
  kpiTargets: [{ id: "k1", employee_id: null, target_year: 2026, period: "year", period_no: 0, amount: 1_200_000_000, created_at: "" }],
  exportedAt: "2026-10-26T10:00:00.000Z",
};

describe("buildOfflineAppHtml", () => {
  const html = buildOfflineAppHtml(sample as never);

  it("embeds the full data with < escaped so the script cannot break out", () => {
    expect(html).toContain("Nguyễn \\u003cAn>");
    expect(html).not.toContain("Nguyễn <An>");
  });

  it("persists edits to localStorage under a stable key", () => {
    expect(html).toContain('"vietcasa-offline-v1"');
    expect(html).toContain("localStorage.getItem(STORE_KEY)");
    expect(html).toContain("localStorage.setItem(STORE_KEY");
  });

  it("ships all five views and the record/employee/kpi forms", () => {
    for (const label of ["Dashboard Doanh số", "Dashboard Công nợ", "Phiếu doanh số", "Nhân viên", "KPI & cài đặt"]) expect(html).toContain(label);
    for (const id of ["f-rec", "f-emp", "f-kpi"]) expect(html).toContain(id);
  });

  it("replicates the finance formulas from src/lib/finance.ts", () => {
    expect(html).toContain("r.gross-r.discount-r.accessories-r.vat-r.kts_commission-r.project_cost");
    expect(html).toContain('r.nature==="cong_ty"?0.5:1');
    expect(html).toContain("Math.max(r.gross-r.deposit,0)");
  });
});
