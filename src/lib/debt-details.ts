import { isFullyPaid } from "./finance";
import type { SalesRecord } from "./data";

export function debtDetailLists(records: SalesRecord[]) {
  return {
    deposit: records.filter((r) => r.deposit > 0 && !isFullyPaid(r)),
    unpaid: records.filter((r) => !isFullyPaid(r)),
    paid: records.filter((r) => isFullyPaid(r) || r.payment_amount > 0),
  };
}