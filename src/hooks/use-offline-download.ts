import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { exportOfflineHtml } from "@/lib/export-html";

let busy = false;
const listeners = new Set<() => void>();
function publish(value: boolean) {
  busy = value;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// One shared lock: the header and settings buttons cannot start two exports.
export function useOfflineDownload() {
  const qc = useQueryClient();
  const isExporting = useSyncExternalStore(subscribe, () => busy, () => false);
  async function download() {
    if (busy) return;
    publish(true);
    try {
      await exportOfflineHtml(qc);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được file HTML");
    } finally {
      publish(false);
    }
  }
  return { isExporting, download };
}