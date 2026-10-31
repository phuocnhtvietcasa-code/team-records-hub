// Browser storage: IndexedDB for large payloads, localStorage for light settings.
// Obfuscation: XOR + Base64. NOTE: XOR is obfuscation, not strong encryption.

const DB_NAME = "vietcasa-store";
const STORE = "kv";

function utf8ToBinary(s: string) {
  return Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join("");
}
function binaryToUtf8(b: string) {
  return new TextDecoder().decode(Uint8Array.from(b, (c) => c.charCodeAt(0)));
}

export function encrypt(plain: string, key: string): string {
  if (!key) throw new Error("Thiếu khóa");
  const data = utf8ToBinary(plain);
  const k = utf8ToBinary(key);
  let out = "";
  for (let i = 0; i < data.length; i++) out += String.fromCharCode(data.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  return btoa(out);
}

export function decrypt(cipher: string, key: string): string {
  if (!key) throw new Error("Thiếu khóa");
  const data = atob(cipher);
  const k = utf8ToBinary(key);
  let out = "";
  for (let i = 0; i < data.length; i++) out += String.fromCharCode(data.charCodeAt(i) ^ k.charCodeAt(i % k.length));
  return binaryToUtf8(out);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLarge(id: string, value: unknown, key: string) {
  const db = await openDb();
  const payload = encrypt(JSON.stringify(value), key);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(payload, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadLarge<T>(id: string, key: string): Promise<T | null> {
  const db = await openDb();
  const payload = await new Promise<string | undefined>((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as string | undefined);
    req.onerror = () => reject(req.error);
  });
  return payload ? (JSON.parse(decrypt(payload, key)) as T) : null;
}

export const settings = {
  get<T>(name: string, fallback: T): T {
    try {
      const v = localStorage.getItem(`vc:${name}`);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(name: string, value: unknown) {
    localStorage.setItem(`vc:${name}`, JSON.stringify(value));
  },
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function buildOfflineHtml(cipher: string, exportedAt: string) {
  const safe = JSON.stringify(cipher).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Vietcasa — Dữ liệu offline</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#222}table{border-collapse:collapse;width:100%;font-size:13px;margin:12px 0 28px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f3f3f3}input,button{padding:8px;font-size:14px}</style></head>
<body><h1>Vietcasa — Dữ liệu offline</h1><p>Xuất lúc: ${exportedAt}</p>
<form id="f"><input id="k" type="password" placeholder="Mật khẩu giải mã" required> <button>Mở dữ liệu</button></form><div id="out"></div>
<script>
const CIPHER=${safe};
function dec(c,key){const d=atob(c);const k=Array.from(new TextEncoder().encode(key));const o=new Uint8Array(d.length);for(let i=0;i<d.length;i++)o[i]=d.charCodeAt(i)^k[i%k.length];return new TextDecoder().decode(o)}
function esc(v){return String(v??"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}
function table(title,rows){if(!rows.length)return "<h2>"+title+"</h2><p>Trống</p>";const cols=Object.keys(rows[0]);return "<h2>"+title+" ("+rows.length+")</h2><table><tr>"+cols.map(c=>"<th>"+esc(c)+"</th>").join("")+"</tr>"+rows.map(r=>"<tr>"+cols.map(c=>"<td>"+esc(r[c])+"</td>").join("")+"</tr>").join("")+"</table>"}
document.getElementById("f").onsubmit=e=>{e.preventDefault();try{const d=JSON.parse(dec(CIPHER,document.getElementById("k").value));document.getElementById("out").innerHTML=table("Nhân viên",d.employees||[])+table("Phiếu doanh số",d.records||[])+table("KPI",d.kpiTargets||[])}catch{alert("Sai mật khẩu")}};
</script></body></html>`;
}
