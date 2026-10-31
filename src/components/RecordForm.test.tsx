import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RecordForm, emptyRecord } from "./RecordForm";

afterEach(cleanup);

it("reactively calculates debt minus deposit minus payment and submits the entered payment", async () => {
  const onSubmit = vi.fn().mockResolvedValue(false);
  render(<RecordForm initial={{ ...emptyRecord("e1"), voucher_no: "P001", customer: "Khách A" }} employees={[]} submitLabel="Lưu" onSubmit={onSubmit} />);
  fireEvent.change(screen.getByLabelText("Doanh số tổng"), { target: { value: "100000000" } });
  fireEvent.change(screen.getByLabelText("Tiền cọc"), { target: { value: "30000000" } });
  fireEvent.change(screen.getByLabelText("Số tiền thanh toán"), { target: { value: "10000000" } });
  expect(screen.getByText("Công nợ").parentElement).toHaveTextContent("100.000.000 đ");
  expect(screen.getByText("Công nợ còn lại").parentElement).toHaveTextContent("60.000.000 đ");
  fireEvent.submit(screen.getByRole("button", { name: "Lưu" }).closest("form") as HTMLFormElement);
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ deposit: 30_000_000, payment_amount: 10_000_000 })));
});

it("fully paid forces the displayed remainder to zero despite unequal amounts", () => {
  render(<RecordForm initial={{ ...emptyRecord("e1"), deposit: 30_000_000, payment_amount: 10_000_000, debt_status: "thanh_toan_du" }} employees={[]} submitLabel="Lưu" onSubmit={async () => false} />);
  expect(screen.getByText("Công nợ còn lại").parentElement).toHaveTextContent("0 đ");
  fireEvent.change(screen.getByLabelText("Số tiền thanh toán"), { target: { value: "5000000" } });
  expect(screen.getByText("Công nợ còn lại").parentElement).toHaveTextContent("0 đ");
});