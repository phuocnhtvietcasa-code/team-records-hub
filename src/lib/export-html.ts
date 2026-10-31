import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { employeesQuery, kpiTargetsQuery, recordsQuery } from "./data";
import { downloadBlob, encrypt, loadLarge, saveLarge, settings } from "./storageService";
import type { OfflineAppData } from "./offline-app";

export async function collectData(qc: QueryClient) {
  const [employees, records, kpiTargets] = await Promise.all([
    qc.fetchQuery(employeesQuery),
    qc.fetchQuery(recordsQuery),
    qc.fetchQuery(kpiTargetsQuery),
  ]);
  return { employees, records, kpiTargets, exportedAt: new Date().toISOString() };
}

function askKey() {
  const key = window.prompt("Đặt mật khẩu để mã hóa dữ liệu (cần khi mở file):");
  if (!key) toast.error("Đã hủy: cần mật khẩu");
  return key || null;
}

export function injectOfflineData(html: string, cipher: string) {
  if (!/<\/body\s*>/i.test(html)) throw new Error("Mẫu HTML không hợp lệ");
  if (!html.includes("window.__OFFLINE_DATA__")) throw new Error("Mẫu HTML chưa hỗ trợ dữ liệu offline");
  const safe = JSON.stringify(cipher).replace(/</g, "\\u003c");
  return html.replace(/<\/body\s*>/i, () => `<script>window.__OFFLINE_DATA__ = ${safe};</script></body>`);
}

export async function createOfflineHtmlBlob(qc: QueryClient, key: string) {
  // The hosted app has no persisted business queries. Refresh the full,
  // authorized snapshot, then read it back from our own IndexedDB store.
  // Never enumerate browser storage: it also contains authentication tokens.
  const current = await collectData(qc);
  await saveLarge("current-html-export", current, key);
  const data = await loadLarge<OfflineAppData>("current-html-export", key);
  if (!data) throw new Error("Không đọc được dữ liệu đã lưu trên trình duyệt");
  const cipher = encrypt(JSON.stringify(data), key);
  const response = await fetch("/downloads/vietcasa-offline-template.html", { cache: "no-store" });
  if (!response.ok) throw new Error("Không tải được mẫu HTML. Vui lòng thử lại.");
  const html = injectOfflineData(await response.text(), cipher);
  settings.set("lastExportAt", data.exportedAt);
  return new Blob([html], { type: "text/html" });
}

export async function exportOfflineHtml(qc: QueryClient) {
  const key = askKey();
  if (!key) return;
  const blob = await createOfflineHtmlBlob(qc, key);
  downloadBlob(blob, "Vietcasa-App-Offline.html");
  toast.success("Đã tải file HTML");
}

export async function exportBackup(qc: QueryClient) {
  const key = askKey();
  if (!key) return;
  try {
    const data = await collectData(qc);
    await saveLarge("last-backup", data, key);
    settings.set("lastBackupAt", data.exportedAt);
    downloadBlob(new Blob([encrypt(JSON.stringify(data), key)], { type: "text/plain" }), `vietcasa-sao-luu-${data.exportedAt.slice(0, 10)}.vcbak`);
    toast.success("Đã sao lưu dữ liệu");
  } catch (e) {
    toast.error((e as Error).message);
  }
}
