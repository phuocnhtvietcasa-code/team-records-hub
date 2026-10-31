import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Database, Download, FileSpreadsheet, Github, Loader2, PackageOpen, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExcelImportDialog } from "@/components/ExcelImportDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useMe } from "@/lib/data";
import { exportBackup } from "@/lib/export-html";
import { useOfflineDownload } from "@/hooks/use-offline-download";
import { decrypt, saveLarge, settings } from "@/lib/storageService";

export const Route = createFileRoute("/_authenticated/cai-dat")({
  head: () => ({
    meta: [
      { title: "Cài đặt & dữ liệu — Vietcasa" },
      { name: "description", content: "Xuất file HTML offline, sao lưu và khôi phục dữ liệu." },
      { property: "og:title", content: "Cài đặt & dữ liệu — Vietcasa" },
      { property: "og:description", content: "Xuất file HTML offline, sao lưu và khôi phục dữ liệu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin } = useMe();
  const qc = useQueryClient();
  const { isExporting, download } = useOfflineDownload();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [excelOpen, setExcelOpen] = useState(false);
  const soon = () => toast.info("Tính năng đang được phát triển");

  async function restore(file: File) {
    const key = window.prompt("Nhập mật khẩu của file sao lưu:");
    if (!key) return;
    try {
      const data = JSON.parse(decrypt(await file.text(), key));
      await saveLarge("restored", data, key);
      settings.set("lastRestoreAt", new Date().toISOString());
      toast.success(`Đã đọc bản sao lưu: ${data.records?.length ?? 0} phiếu, ${data.employees?.length ?? 0} nhân viên (lưu trên trình duyệt)`);
    } catch {
      toast.error("Sai mật khẩu hoặc file không hợp lệ");
    }
  }

  const cards: { icon: LucideIcon; title: string; desc: string; action: string; onClick: () => void; danger?: boolean }[] = [
    { icon: FileSpreadsheet, title: "Nhập dữ liệu Excel", desc: "Nhập phiếu doanh số từ tệp .xlsx, .xls.", action: "Nhập dữ liệu Excel", onClick: () => setExcelOpen(true) },
    { icon: Download, title: "Tải file HTML", desc: "Xuất toàn bộ dữ liệu đã mã hóa vào một file HTML xem offline.", action: "Tải file HTML", onClick: download },
    { icon: Github, title: "Đồng bộ GitHub", desc: "Đồng bộ mã nguồn và dữ liệu với kho GitHub.", action: "Đồng bộ", onClick: soon },
    { icon: Database, title: "Sao lưu dữ liệu", desc: "Tải về file sao lưu đã mã hóa của nhân viên, phiếu và KPI.", action: "Sao lưu", onClick: () => exportBackup(qc) },
    { icon: RotateCcw, title: "Khôi phục dữ liệu", desc: "Mở file sao lưu đã mã hóa và lưu vào trình duyệt.", action: "Chọn file", onClick: () => fileRef.current?.click() },
    { icon: PackageOpen, title: "Nạp dữ liệu mẫu", desc: "Thêm bộ dữ liệu mẫu để dùng thử.", action: "Nạp mẫu", onClick: soon },
    { icon: Trash2, title: "Bắt đầu kho trống", desc: "Xóa toàn bộ dữ liệu để bắt đầu lại từ đầu.", action: "Bắt đầu kho trống", onClick: () => setConfirmEmpty(true), danger: true },
  ];

  if (!isAdmin) return <p className="text-muted-foreground">Chỉ Admin được truy cập trang này.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Cài đặt & dữ liệu</h1>
        <p className="text-sm text-muted-foreground">Quản lý xuất, sao lưu và khôi phục dữ liệu hệ thống.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className={`flex flex-col rounded-xl border bg-card p-6 shadow-sm ${c.title === "Nhập dữ liệu Excel" ? "cursor-pointer" : ""}`} onClick={c.title === "Nhập dữ liệu Excel" ? c.onClick : undefined}>
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${c.danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">{c.title}</h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{c.desc}</p>
            <Button className="mt-5 w-full" variant={c.danger ? "destructive" : "default"} onClick={c.onClick} disabled={c.title === "Tải file HTML" && isExporting} aria-busy={c.title === "Tải file HTML" && isExporting}>{c.title === "Tải file HTML" && isExporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang tạo file...</> : c.action}</Button>
          </div>
        ))}
      </div>
      <ExcelImportDialog open={excelOpen} onOpenChange={setExcelOpen} />
      <input ref={fileRef} type="file" accept=".vcbak,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ""; }} />
      <AlertDialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bắt đầu kho trống?</AlertDialogTitle>
            <AlertDialogDescription>Thao tác này sẽ xóa toàn bộ dữ liệu. Tính năng đang ở dạng giao diện, chưa xóa dữ liệu thật.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={soon}>Tôi hiểu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
