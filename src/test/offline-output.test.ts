import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function validate(html: string, extra?: string) {
  const dir = mkdtempSync(join(tmpdir(), "offline-check-"));
  try {
    writeFileSync(join(dir, "index.html"), html);
    if (extra) writeFileSync(join(dir, extra), "extra");
    return spawnSync("python3", ["scripts/verify_offline.py", dir, "--static-only"], { encoding: "utf8" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("Single-file offline output rules", () => {
  it("accepts exactly one index.html with embedded assets", () => {
    expect(validate('<style>body{background:url(data:image/png;base64,AA==)}</style><img src="data:image/png;base64,AA==">').status).toBe(0);
  });
  it("rejects a second emitted file", () => {
    expect(validate("<!doctype html>", "app.js").status).toBe(1);
  });
  it.each([
    '<script src="./app.js"></script>',
    '<link rel="stylesheet" href="/style.css">',
    '<img src="https://example.com/logo.png">',
    '<style>body{background:url(./logo.png)}</style>',
    '<style>@import "https://example.com/font.css";</style>',
  ])("rejects an external asset: %s", (html) => {
    expect(validate(html).status).toBe(1);
  });
});