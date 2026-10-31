import { mkdir, writeFile } from "node:fs/promises";
import { buildOfflineAppHtml } from "../src/lib/offline-app";

// Prebuild the existing standalone edition, not the hosted SSR document:
// fetching / would retain external modules and require a server.
const empty = { employees: [], records: [], kpiTargets: [], exportedAt: "" };
const html = buildOfflineAppHtml(empty)
  .replace('<script>\nvar EMBED=', '<script>\ndocument.addEventListener("DOMContentLoaded", function () {\nvar EMBED=')
  .replace('var EMBED=' + JSON.stringify(empty) + ';', `var EMBED;
try {
  var key = window.prompt("Nhập mật khẩu để mở file Vietcasa:");
  if (!key) throw new Error("Cần mật khẩu để mở dữ liệu.");
  var cipher = atob(window.__OFFLINE_DATA__);
  var bytes = new TextEncoder().encode(key);
  var decoded = new Uint8Array(cipher.length);
  for (var i=0;i<cipher.length;i++) decoded[i]=cipher.charCodeAt(i)^bytes[i%bytes.length];
  EMBED = JSON.parse(new TextDecoder().decode(decoded));
  if (!Array.isArray(EMBED.records) || !Array.isArray(EMBED.employees) || !Array.isArray(EMBED.kpiTargets)) throw new Error("Dữ liệu không hợp lệ");
} catch (e) {
  document.getElementById("app").textContent="Không mở được dữ liệu. Hãy tải lại file và nhập đúng mật khẩu.";
  return;
}`)
  .replace('var STORE_KEY="vietcasa-offline-v1";', 'var STORE_KEY="vietcasa-offline-v1:"+EMBED.exportedAt;')
  .replace('render();\n</script>', 'render();\n});\n</script>');
await mkdir("public/downloads", { recursive: true });
await writeFile("public/downloads/vietcasa-offline-template.html", html);