import { describe, expect, it } from "vitest";
import { canWriteEmployeeRecord, companyNet, costBreakdown, debtAmount, kpiStatus, readableEmployees, recordScopeEmployees, selectedEmployees, canWriteRecords, companyRevenue, daysOwed, debtWarning, formatMoneyInput, monthlyKpi, netBeforeAllocation, netRevenue, outstanding, parseMoneyInput, periodKpi, remainingDebt } from "./finance";

const base = {
  gross: 100_000_000,
  discount: 5_000_000,
  accessories: 3_000_000,
  vat: 8_000_000,
  kts_commission: 2_000_000,
  project_cost: 4_000_000,
  nature: "ca_nhan",
  deposit: 30_000_000,
  debt_status: "coc_30",
};
const today = new Date(2026, 9, 25);

describe("team, selection and cost rules", () => {
  const leader = { id: "L", team: "A", team_role: "leader" };
  const members = [leader, { id: "A1", team: "A", team_role: "member" }, { id: "B1", team: "B", team_role: "member" }];
  it("staff dashboard shows only own employee, even for team leaders", () => {
    expect(readableEmployees(members, "staff", leader).map(e => e.id)).toEqual(["L"]);
  });
  it("member sees only own employee", () => {
    expect(readableEmployees(members, "staff", members[1]).map(e => e.id)).toEqual(["A1"]);
  });
  it("admin and manager dashboards see the whole company", () => {
    expect(readableEmployees(members, "admin", null).map(e => e.id)).toEqual(["L", "A1", "B1"]);
    expect(readableEmployees(members, "manager", null).map(e => e.id)).toEqual(["L", "A1", "B1"]);
  });
  it("records list: admin sees all, manager sees own team, staff sees own", () => {
    expect(recordScopeEmployees(members, "admin", null).map(e => e.id)).toEqual(["L", "A1", "B1"]);
    expect(recordScopeEmployees(members, "manager", leader).map(e => e.id)).toEqual(["L", "A1"]);
    expect(recordScopeEmployees(members, "staff", members[1]).map(e => e.id)).toEqual(["A1"]);
  });
  it("manager without a team sees only own records", () => {
    expect(recordScopeEmployees(members, "manager", { id: "M", team: "", team_role: "member" }).map(e => e.id)).toEqual([]);
    expect(recordScopeEmployees([...members, { id: "M", team: "", team_role: "member" }], "manager", { id: "M", team: "", team_role: "member" }).map(e => e.id)).toEqual(["M"]);
  });
  it("multi-select includes only selected employees without duplicates", () => {
    expect(selectedEmployees(members, ["L", "B1", "L"]).map(e => e.id)).toEqual(["L", "B1"]);
    expect(selectedEmployees(members, [])).toEqual([]);
    expect(selectedEmployees(members, null)).toEqual(members);
  });
  it("all five costs use gross rather than allocated net", () => {
    const result = costBreakdown([base, { ...base, nature: "cong_ty" }]);
    expect(result.gross).toBe(200_000_000);
    expect(result.items.map(i => [i.amount, i.pct])).toEqual([[10_000_000, 5], [6_000_000, 3], [16_000_000, 8], [4_000_000, 2], [8_000_000, 4]]);
    expect(result.total).toBe(44_000_000);
  });
  it("zero gross never gives an infinite cost percentage", () => {
    expect(costBreakdown([{ ...base, gross: 0 }]).items.map(i => i.pct)).toEqual([0, 0, 0, 0, 0]);
  });
  it("only admin can delete or edit a record", () => {
    expect(canWriteEmployeeRecord("staff", "L", "A1")).toBe(false);
    expect(canWriteEmployeeRecord("staff", "L", "L")).toBe(false);
    expect(canWriteEmployeeRecord("manager", "L", "L")).toBe(false);
    expect(canWriteEmployeeRecord("admin", "L", "A1")).toBe(true);
  });
});

describe("finance rules", () => {
  it("net revenue for individual keeps full amount", () => {
    expect(netRevenue(base)).toBe(78_000_000);
  });
  it("net revenue for company is halved", () => {
    expect(netRevenue({ ...base, nature: "cong_ty" })).toBe(39_000_000);
  });
  it("debt = gross - discount + vat", () => {
    expect(debtAmount(base)).toBe(103_000_000);
    expect(debtAmount({ ...base, discount: 0, vat: 0 })).toBe(100_000_000);
  });
  it("remaining debt = debt - deposit - user-entered payment", () => {
    expect(remainingDebt({ ...base, payment_amount: 10_000_000 })).toBe(63_000_000);
  });
  it("fully paid overrides remaining debt to zero", () => {
    expect(remainingDebt({ ...base, payment_amount: 10_000_000, debt_status: "thanh_toan_du" })).toBe(0);
  });
  it("remaining debt preserves negative differences and defaults missing payments to zero", () => {
    expect(remainingDebt({ ...base, payment_amount: 110_000_000 })).toBe(-37_000_000);
    expect(remainingDebt(base)).toBe(73_000_000);
  });
  it("existing dashboard outstanding calculation stays unchanged", () => {
    expect(outstanding(base)).toBe(70_000_000);
  });
  it("fully paid has no outstanding and no days owed", () => {
    const r = { ...base, debt_status: "thanh_toan_du", record_date: "2026-10-01" };
    expect(outstanding(r)).toBe(0);
    expect(daysOwed(r, today)).toBeNull();
  });
  it("overdue when due date passed", () => {
    expect(debtWarning({ ...base, due_date: "2026-10-24" }, today)).toBe("overdue");
  });
  it("due soon when under 7 days left", () => {
    expect(debtWarning({ ...base, due_date: "2026-10-31" }, today)).toBe("soon");
  });
  it("safe when 7+ days left", () => {
    expect(debtWarning({ ...base, due_date: "2026-11-01" }, today)).toBe("safe");
  });
});

import { inPeriod, targetMonths, weekDays } from "./finance";
describe("week = Monday to Saturday", () => {
  const wed = new Date(2026, 9, 21); // Wed 21/10/2026
  it("includes Monday", () => expect(inPeriod("2026-10-19", "week", wed)).toBe(true));
  it("includes Saturday", () => expect(inPeriod("2026-10-24", "week", wed)).toBe(true));
  it("excludes Sunday", () => expect(inPeriod("2026-10-25", "week", wed)).toBe(false));
  it("excludes previous Saturday", () => expect(inPeriod("2026-10-17", "week", wed)).toBe(false));
  it("week target factor is 6/26", () => expect(targetMonths("week", wed)).toBeCloseTo(6 / 26));
  it("weekDays lists Mon..Sat", () => expect(weekDays(wed)).toEqual(["2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24"]));
});

describe("selectable week/month/quarter ranges", () => {
  const oct = new Date(2026, 9, 31); // Sat 31/10/2026
  it("week sub 1 covers days 1-7 of the month, still skipping Sunday", () => {
    expect(inPeriod("2026-10-01", "week", oct, 1)).toBe(true);
    expect(inPeriod("2026-10-04", "week", oct, 1)).toBe(false); // Chủ nhật
    expect(inPeriod("2026-10-08", "week", oct, 1)).toBe(false);
    expect(inPeriod("2026-10-08", "week", oct, 2)).toBe(true);
  });
  it("last week of month ends on the last day", () => {
    expect(inPeriod("2026-10-31", "week", oct, 5)).toBe(true);
    expect(inPeriod("2026-10-21", "week", oct, 5)).toBe(false);
  });
  it("month sub picks that month of the current year", () => {
    expect(inPeriod("2026-03-15", "month", oct, 3)).toBe(true);
    expect(inPeriod("2026-10-15", "month", oct, 3)).toBe(false);
    expect(inPeriod("2025-03-15", "month", oct, 3)).toBe(false);
  });
  it("quarter sub uses static ranges Q1..Q4", () => {
    expect(inPeriod("2026-01-01", "quarter", oct, 1)).toBe(true);
    expect(inPeriod("2026-03-31", "quarter", oct, 1)).toBe(true);
    expect(inPeriod("2026-04-01", "quarter", oct, 1)).toBe(false);
    expect(inPeriod("2026-12-31", "quarter", oct, 4)).toBe(true);
    expect(inPeriod("2026-09-30", "quarter", oct, 4)).toBe(false);
  });
  it("periodKpi follows the selected month and quarter", () => {
    const settings = [
      { employee_id: "A", target_year: 2026, period: "month", period_no: 3, amount: 900_000_000 },
      { employee_id: "A", target_year: 2026, period: "quarter", period_no: 2, amount: 3_000_000_000 },
    ];
    expect(periodKpi(settings, "A", "month", oct, 0, 3)).toBe(900_000_000);
    expect(periodKpi(settings, "A", "quarter", oct, 0, 2)).toBe(3_000_000_000);
  });
});

describe("online sales and KPI rules", () => {
  it("parses formatted 1.000.000 into a numeric million", () => {
    expect(parseMoneyInput("1.000.000")).toBe(1_000_000);
    expect(formatMoneyInput("1000000")).toBe("1.000.000");
    expect(parseMoneyInput("")).toBe(0);
  });
  it("manager and staff cannot write records", () => {
    expect(canWriteRecords("manager")).toBe(false);
    expect(canWriteRecords("staff")).toBe(false);
  });
  it("only admin retains record writes", () => {
    expect(canWriteRecords("admin")).toBe(true);
  });
  it("splits company net exactly equally without using gross", () => {
    const r = { ...base, nature: "cong_ty" };
    expect(companyRevenue(r)).toBe(39_000_000);
    expect(netRevenue(r)).toBe(39_000_000);
    expect(companyRevenue(r) + netRevenue(r)).toBe(netBeforeAllocation(r));
  });
  it("individual net belongs only to employee", () => {
    expect(netRevenue(base)).toBe(78_000_000);
    expect(companyRevenue(base)).toBe(0);
  });
  it("dashboard company total = full net of every record, individual and company alike", () => {
    expect(companyNet(base)).toBe(78_000_000);
    expect(companyNet({ ...base, nature: "cong_ty" })).toBe(78_000_000);
    expect(companyNet(base)).toBe(netBeforeAllocation(base));
  });
  it("KPI status: under 70% Chưa đạt, 70-99% Sắp đạt, 100%+ Đã đạt", () => {
    expect(kpiStatus(0)).toBe("missed");
    expect(kpiStatus(69.9)).toBe("missed");
    expect(kpiStatus(70)).toBe("near");
    expect(kpiStatus(99.9)).toBe("near");
    expect(kpiStatus(100)).toBe("achieved");
    expect(kpiStatus(140)).toBe("achieved");
  });
  const targets = [
    { employee_id: "A", target_year: 2026, period: "year", period_no: 1, amount: 8_000_000_000 },
    { employee_id: null, target_year: 2026, period: "year", period_no: 1, amount: 25_000_000_000 },
  ];
  it("employee annual 8 billion stays independent from company 25 billion", () => {
    expect(periodKpi(targets, "A", "year", today)).toBeCloseTo(8_000_000_000);
    expect(periodKpi(targets, null, "year", today)).toBeCloseTo(25_000_000_000);
  });
  it("quarter and month settings override only their own periods", () => {
    const settings = [...targets,
      { employee_id: "A", target_year: 2026, period: "quarter", period_no: 1, amount: 3_000_000_000 },
      { employee_id: "A", target_year: 2026, period: "month", period_no: 2, amount: 2_000_000_000 },
    ];
    expect(monthlyKpi(settings, "A", 2026, 1)).toBe(1_000_000_000);
    expect(monthlyKpi(settings, "A", 2026, 2)).toBe(2_000_000_000);
    expect(monthlyKpi(settings, "A", 2026, 4)).toBeCloseTo(8_000_000_000 / 12);
    expect(monthlyKpi(settings, "A", 2027, 1)).toBe(0);
  });
});
