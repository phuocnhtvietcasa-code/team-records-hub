import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useOfflineDownload } from "./use-offline-download";
import { exportOfflineHtml } from "@/lib/export-html";

vi.mock("@/lib/export-html", () => ({ exportOfflineHtml: vi.fn() }));

describe("shared HTML export lock", () => {
  it("locks both buttons, ignores duplicate clicks, and unlocks after errors", async () => {
    let fail: ((error: Error) => void) | undefined;
    vi.mocked(exportOfflineHtml).mockImplementation(() => new Promise((_resolve, reject) => { fail = reject; }));
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => [useOfflineDownload(), useOfflineDownload()], { wrapper });
    let pending: Promise<void> | undefined;
    act(() => { pending = result.current[0].download(); });
    expect(result.current.every((hook) => hook.isExporting)).toBe(true);
    await act(async () => { await result.current[1].download(); });
    expect(exportOfflineHtml).toHaveBeenCalledTimes(1);
    await act(async () => { fail?.(new Error("Failed fetch")); await pending; });
    await waitFor(() => expect(result.current.every((hook) => !hook.isExporting)).toBe(true));
  });
});