import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhieuPage } from "@/routes/_authenticated/phieu";
import { FilterProvider } from "@/lib/filters";
import { useMe, type Employee, type SalesRecord } from "@/lib/data";
import { useFilteredRecords } from "@/lib/use-filtered";

vi.mock("@/lib/data", () => ({ useMe: vi.fn() }));
vi.mock("@/lib/use-filtered", () => ({ useFilteredRecords: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const employee: Employee = {
  id: "e1",
  code: "00001",
  created_at: "",
  department: "",
  full_name: "Nhân viên A",
  monthly_target: 0,
  position: "",
  team: "T1",
  team_role: "member",
  user_id: "u1",
};

const record: SalesRecord = {
  id: "r1",
  voucher_no: "P001",
  employee_id: "e1",
  customer: "Khách A",
  project: "",
  record_date: "2026-10-30",
  due_date: "2026-11-30",
  created_at: "",
  created_by: null,
  gross: 100_000_000,
  deposit: 30_000_000,
  payment_amount: 10_000_000,
  discount: 0,
  accessories: 0,
  vat: 0,
  kts_commission: 0,
  project_cost: 0,
  nature: "ca_nhan",
  debt_status: "thanh_toan_1_phan",
};

function mockSession(role: "admin" | "manager" | "staff") {
  vi.mocked(useMe).mockReturnValue({
    me: { id: "u1", email: "u@x", role, employee },
    role,
    isAdmin: role === "admin",
    canManage: role === "admin" || role === "manager",
    canWrite: role === "admin",
  });
  vi.mocked(useFilteredRecords).mockReturnValue({
    filtered: [record],
    scope: [employee],
    availableEmployees: [employee],
    listEmployees: [employee],
    listScope: [employee],
    listFiltered: [record],
    employees: [employee],
    empMap: new Map([["e1", employee]]),
    today: new Date("2026-10-31T00:00:00Z"),
    loading: false,
  });
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <FilterProvider>
        <PhieuPage />
      </FilterProvider>
    </QueryClientProvider>,
  );
}

describe("Phiếu doanh số: mọi vai trò xem được phiếu, chỉ Admin sửa/xóa", () => {
  afterEach(cleanup);

  it("Quản lý mở được phiếu và không thấy nút Lưu thay đổi hay Xóa", () => {
    mockSession("manager");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Xem phiếu P001" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Số tiền thanh toán")).toHaveValue("10.000.000");
    expect(within(dialog).getByLabelText("Số tiền thanh toán")).toBeDisabled();
    expect(within(dialog).queryByRole("button", { name: "Lưu thay đổi" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Xóa" })).toBeNull();
  });

  it("Nhân viên mở được phiếu của mình và cũng chỉ xem", () => {
    mockSession("staff");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Xem phiếu P001" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Số tiền thanh toán")).toBeDisabled();
    expect(within(dialog).queryByRole("button", { name: "Lưu thay đổi" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Xóa" })).toBeNull();
  });

  it("Admin mở phiếu và thấy đủ nút Lưu thay đổi cùng Xóa", () => {
    mockSession("admin");
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Xem phiếu P001" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Số tiền thanh toán")).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Lưu thay đổi" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Xóa" })).toBeEnabled();
  });
});
