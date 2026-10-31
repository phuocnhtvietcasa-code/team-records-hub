import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DebtDetails } from "./debt-details";
import type { SalesRecord } from "@/lib/data";

afterEach(cleanup);
const record: SalesRecord = {
  id: "r1", voucher_no: "P001", employee_id: "e1", customer: "Khách A", project: "",
  record_date: "2026-10-30", due_date: "2026-11-30", created_at: "", created_by: null,
  gross: 100_000_000, deposit: 30_000_000, payment_amount: 10_000_000,
  discount: 0, accessories: 0, vat: 0, kts_commission: 0, project_cost: 0,
  nature: "ca_nhan", debt_status: "thanh_toan_1_phan",
};

it("voucher action opens the corresponding record without enabling writes", () => {
  render(<DebtDetails records={[record]} employees={[]} empMap={new Map()} />);
  fireEvent.click(screen.getByRole("button", { name: "Xem phiếu P001" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByLabelText("Số tiền thanh toán")).toHaveValue("10.000.000");
  expect(within(dialog).getByLabelText("Số tiền thanh toán")).toBeDisabled();
  expect(within(dialog).getByLabelText("Tiền cọc")).toHaveValue("30.000.000");
});