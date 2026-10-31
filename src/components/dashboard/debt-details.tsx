import { useState } from "react";
import { RecordForm } from "@/components/RecordForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Employee, SalesRecord } from "@/lib/data";
import { debtDetailLists } from "@/lib/debt-details";
import { formatVND, grossPercentage, remainingDebt } from "@/lib/finance";
import { RevenueSection } from "./revenue-ui";

const LISTS = [
  { key: "deposit", label: "Đang có tiền cọc", amount: "Số tiền cọc", percent: "Tỷ lệ cọc" },
  { key: "unpaid", label: "Chưa thanh toán", amount: "Công nợ còn lại", percent: "Tỷ lệ nợ" },
  { key: "paid", label: "Đã thanh toán", amount: "Số tiền thanh toán", percent: null },
] as const;

export function DebtDetails({ records, employees, empMap }: { records: SalesRecord[]; employees: Employee[]; empMap: Map<string, Employee> }) {
  const [detail, setDetail] = useState<SalesRecord | null>(null);
  const groups = debtDetailLists(records);
  return <>
    <RevenueSection title="Chi tiết phiếu công nợ">
      <Tabs defaultValue="deposit" className="min-w-0">
        <div className="max-w-full overflow-x-auto">
          <TabsList className="h-auto justify-start">
            {LISTS.map((list) => <TabsTrigger key={list.key} value={list.key}>{list.label} ({groups[list.key].length})</TabsTrigger>)}
          </TabsList>
        </div>
        {LISTS.map((list) => <TabsContent key={list.key} value={list.key}>
          <Table className="min-w-[640px]">
            <TableHeader><TableRow>
              <TableHead>Số phiếu</TableHead><TableHead>Tên nhân viên</TableHead><TableHead>Tên khách hàng</TableHead>
              <TableHead className="text-right">{list.amount}</TableHead>
              {list.percent && <TableHead className="text-right">{list.percent}</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {groups[list.key].map((r) => {
                const amount = list.key === "deposit" ? r.deposit : list.key === "unpaid" ? remainingDebt(r) : r.payment_amount;
                return <TableRow key={r.id}>
                  <TableCell><Button type="button" variant="link" className="h-auto p-0" aria-label={`Xem phiếu ${r.voucher_no}`} onClick={() => setDetail(r)}>{r.voucher_no}</Button></TableCell>
                  <TableCell>{empMap.get(r.employee_id)?.full_name ?? "—"}</TableCell><TableCell>{r.customer}</TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">{formatVND(amount)}</TableCell>
                  {list.percent && <TableCell className="text-right tabular-nums">{grossPercentage(amount, r.gross).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%</TableCell>}
                </TableRow>;
              })}
              {groups[list.key].length === 0 && <TableRow><TableCell colSpan={list.percent ? 5 : 4} className="py-8 text-center text-muted-foreground">Không có phiếu.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>)}
      </Tabs>
    </RevenueSection>
    <Dialog open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
      <DialogContent className="max-w-2xl overflow-auto">
        <DialogHeader><DialogTitle>Chi tiết phiếu {detail?.voucher_no}</DialogTitle><DialogDescription>Thông tin doanh số và công nợ của phiếu.</DialogDescription></DialogHeader>
        {detail && <RecordForm key={detail.id} initial={detail} employees={employees} readOnly submitLabel="" onSubmit={async () => false} />}
      </DialogContent>
    </Dialog>
  </>;
}