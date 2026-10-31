import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { employeesQuery, recordsQuery, useMe, type SalesRecord } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";

export function ExcelImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const qc = useQueryClient();
  const { isAdmin } = useMe();
  const fileRef = useRef<HTMLInputElement>(null);
  const importing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");

  async function downloadTemplate() {
    try {
      const [XLSX, { createSalesTemplate }] = await Promise.all([import("xlsx"), import("@/lib/excel-import")]);
      XLSX.writeFile(createSalesTemplate(), "Vietcasa_Mau_Phieu_Doanh_So.xlsx");
    } catch { toast.error("Không thể tải tệp mẫu. Vui lòng thử lại."); }
  }

  async function importFile(file: File) {
    if (!isAdmin || importing.current) return;
    setError("");
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Chỉ nhận tệp .xlsx hoặc .xls");
      toast.error("Chỉ nhận tệp .xlsx hoặc .xls");
      return;
    }
    importing.current = true;
    setBusy(true);
    setFilename(file.name);
    try {
      const [{ parseSalesWorkbook }, employees, existing, buffer] = await Promise.all([
        import("@/lib/excel-import"), qc.fetchQuery(employeesQuery), qc.fetchQuery(recordsQuery), file.arrayBuffer(),
      ]);
      const rows = parseSalesWorkbook(buffer, employees, existing.map((r) => r.voucher_no));
      // One insert keeps the whole import atomic; existing RLS remains authoritative.
      const { data, error: insertError } = await supabase.from("sales_records").insert(rows).select("*");
      if (insertError) throw new Error(insertError.code === "23505" ? "Mã phiếu đã tồn tại. Chưa nhập dữ liệu." : "Không thể lưu phiếu. Vui lòng kiểm tra quyền truy cập và thử lại.");
      qc.setQueryData<SalesRecord[]>(["records"], (previous) => [...(data ?? []), ...(previous ?? existing)]);
      await qc.invalidateQueries({ queryKey: ["records"] });
      toast.success("Nhập dữ liệu thành công", { description: `Đã lưu ${rows.length} phiếu doanh số.` });
      onOpenChange(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Tệp Excel không hợp lệ";
      setError(message);
      toast.error(message);
    } finally {
      importing.current = false;
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!isAdmin) return null;
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!busy) { setError(""); setFilename(""); onOpenChange(value); } }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl" onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onPointerDownOutside={(e) => { if (busy) e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Nhập dữ liệu Excel</DialogTitle>
          <DialogDescription>Phiếu doanh số · .xlsx, .xls</DialogDescription>
        </DialogHeader>
        <div
          className={`flex min-h-48 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-6 text-center ${dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
          onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) void importFile(file); }}
        >
          {busy ? <Loader2 className="h-10 w-10 animate-spin text-primary" /> : <FileSpreadsheet className="h-10 w-10 text-primary" />}
          <p className="max-w-full break-all text-sm text-muted-foreground">{busy ? `Đang nhập: ${filename}` : "Kéo và thả tệp Excel vào đây"}</p>
          <Button disabled={busy} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Chọn tệp</Button>
          <input ref={fileRef} aria-label="Tệp Excel" type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void importFile(file); }} />
        </div>
        {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
        <Button variant="link" className="h-auto justify-start whitespace-normal px-0 text-left" disabled={busy} onClick={downloadTemplate}>
          <Download className="h-4 w-4 shrink-0" /><span>Tải tệp mẫu cơ bản (Bao gồm đầy đủ các trường thông tin)</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}