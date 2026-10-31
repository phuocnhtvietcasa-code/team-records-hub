import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { decrypt } from "./storageService";
import { createOfflineHtmlBlob, injectOfflineData } from "./export-html";

const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock("./data", () => ({
  employeesQuery: { queryKey: ["employees"], queryFn: async () => [{ full_name: "Nguyễn An" }] },
  recordsQuery: { queryKey: ["records"], queryFn: async () => [{ voucher_no: "P001", payment_amount: 2500000 }] },
  kpiTargetsQuery: { queryKey: ["kpi-targets"], queryFn: async () => [{ amount: 12000000 }] },
}));
vi.mock("./storageService", async (original) => ({
  ...await original<typeof import("./storageService")>(),
  saveLarge: vi.fn(async (id, data) => { store.set(id, data); }),
  loadLarge: vi.fn(async (id) => store.get(id)),
}));

describe("encrypted HTML export", () => {
  beforeEach(() => { store.clear(); localStorage.clear(); vi.unstubAllGlobals(); });
  it("reads business data from browser storage, encodes it and injects it into fetched HTML", async () => {
    localStorage.setItem("sb-private-auth-token", "must-not-export");
    const fetcher = vi.fn(async () => new Response('<html><body><script>const value=window.__OFFLINE_DATA__;</script></body></html>'));
    vi.stubGlobal("fetch", fetcher);
    const blob = await createOfflineHtmlBlob(new QueryClient(), "test-password");
    const html = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob); });
    const match = html.match(/window\.__OFFLINE_DATA__ = "([^"]+)"/);
    if (!match) throw new Error("No embedded payload");
    const payload = JSON.parse(decrypt(match[1]!, "test-password"));
    expect(payload.records).toEqual([{ voucher_no: "P001", payment_amount: 2500000 }]);
    expect(payload.employees).toEqual([{ full_name: "Nguyễn An" }]);
    expect(payload.kpiTargets).toEqual([{ amount: 12000000 }]);
    expect(html).not.toContain("must-not-export");
    expect(html).not.toContain("Nguyễn An");
    expect(blob.type).toBe("text/html");
    expect(fetcher).toHaveBeenCalledWith("/downloads/vietcasa-offline-template.html", { cache: "no-store" });
  });
  it("rejects a failed template fetch instead of downloading an error page", async () => {
    vi.stubGlobal("fetch", async () => new Response("Unavailable", { status: 503 }));
    await expect(createOfflineHtmlBlob(new QueryClient(), "test-password")).rejects.toThrow("Không tải được mẫu HTML");
  });
  it("escapes script termination in injected data", () => {
    const html = injectOfflineData('<body>window.__OFFLINE_DATA__</BODY>', '</script><img src=x>');
    expect(html).not.toContain('</script><img');
    expect(html).toContain('\\u003c/script>');
  });
  it("rejects hosted HTML without an offline data consumer", () => {
    expect(() => injectOfflineData('<body><script src="/app.js"></script></body>', 'data')).toThrow("chưa hỗ trợ");
  });
});