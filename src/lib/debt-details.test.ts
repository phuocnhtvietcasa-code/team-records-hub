import { describe, expect, it } from "vitest";
import { debtDetailLists } from "./debt-details";
import { grossPercentage, remainingDebt } from "./finance";
import type { SalesRecord } from "./data";

const record: SalesRecord = {
  id: "deposit", voucher_no: "P001", employee_id: "e1", customer: "Khách A", project: "",
  record_date: "2026-10-30", due_date: "2026-11-30", created_at: "", created_by: null,
  gross: 100_000_000, deposit: 30_000_000, payment_amount: 10_000_000,
  discount: 0, accessories: 0, vat: 0, kts_commission: 0, project_cost: 0,
  nature: "ca_nhan", debt_status: "thanh_toan_1_phan",
};

describe("debt detail rules", () => {
  it("deposit percentage divides deposit by gross", () => {
    expect(grossPercentage(record.deposit, record.gross)).toBe(30);
  });
  it("debt percentage divides remaining debt by gross", () => {
    expect(grossPercentage(remainingDebt(record), record.gross)).toBe(60);
  });
  it("zero gross yields a finite zero percentage", () => {
    expect(grossPercentage(30_000_000, 0)).toBe(0);
  });
  it("lists active deposits, incomplete payments and entered or full payments", () => {
    const paid = { ...record, id: "paid", debt_status: "thanh_toan_du" };
    const unpaid = { ...record, id: "unpaid", deposit: 0, payment_amount: 0, debt_status: "chua_thanh_toan" };
    const lists = debtDetailLists([record, paid, unpaid]);
    expect(lists.deposit.map((r) => r.id)).toEqual(["deposit"]);
    expect(lists.unpaid.map((r) => r.id)).toEqual(["deposit", "unpaid"]);
    expect(lists.paid.map((r) => r.id)).toEqual(["deposit", "paid"]);
    expect(lists.paid[0]?.payment_amount).toBe(10_000_000);
  });
});