import type { Employee, SalesRecord } from "./data";
import { collected, costBreakdown, netBeforeAllocation, netRevenue, outstanding, DEBT_STATUS_LABELS, type DebtStatus } from "./finance";

/** Build the read-only snapshot shown by the offline dashboard file. */
export function buildSnapshot(employees: Employee[], records: SalesRecord[], exportedAt: string) {
  const emp = new Map(employees.map((e) => [e.id, e]));
  const sum = (f: (r: SalesRecord) => number) => records.reduce((s, r) => s + f(r), 0);
  const costs = costBreakdown(records);
  const byEmployee = employees.map((e) => {
    const rs = records.filter((r) => r.employee_id === e.id);
    return { name: e.full_name, code: e.code, team: e.team, count: rs.length, gross: rs.reduce((s, r) => s + r.gross, 0), net: rs.reduce((s, r) => s + netRevenue(r), 0), outstanding: rs.reduce((s, r) => s + outstanding(r), 0) };
  });
  return {
    exportedAt,
    metrics: { count: records.length, gross: sum((r) => r.gross), net: sum(netBeforeAllocation), collected: sum(collected), outstanding: sum(outstanding) },
    costs: costs.items.map(({ label, amount, pct }) => ({ label, amount, pct })),
    byEmployee,
    records: records.map((r) => ({ date: r.record_date, voucher: r.voucher_no, employee: emp.get(r.employee_id)?.full_name ?? "", customer: r.customer, project: r.project, gross: r.gross, net: netBeforeAllocation(r), outstanding: outstanding(r), status: DEBT_STATUS_LABELS[r.debt_status as DebtStatus] ?? r.debt_status, due: r.due_date })),
  };
}

export function buildOfflineDashboardHtml(cipher: string, key: string) {
  const c = JSON.stringify(cipher).replace(/</g, "\\u003c");
  const k = JSON.stringify(key).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vietcasa — Dashboard offline</title>
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f5f4fa;color:#1f1d2b}.wrap{max-width:1200px;margin:0 auto;padding:20px}.hero{background:linear-gradient(120deg,#2a1b5c,#4b2a9b);color:#fff;border-radius:20px;padding:28px}.hero h1{margin:0 0 4px;font-size:22px}.hero .big{font-size:36px;font-weight:800;margin-top:16px}.muted{opacity:.75;font-size:13px}.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin:20px 0}.card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 4px 18px rgba(40,20,90,.08)}.card .v{font-size:22px;font-weight:700;margin-top:6px}h2{font-size:17px;margin:0 0 14px}.bar{height:8px;background:#ece9f5;border-radius:9px;overflow:hidden;margin-top:6px}.bar i{display:block;height:100%;background:#6d3fd6}.row{margin-bottom:14px;font-size:14px}.row b{float:right}.tbl{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:8px 10px;border-bottom:1px solid #eee;text-align:left;white-space:nowrap}th{background:#f7f5fc;font-weight:600}td.n{text-align:right}input{padding:9px 12px;border:1px solid #ddd;border-radius:10px;width:100%;max-width:320px;margin-bottom:12px}.badge{display:inline-block;background:#fff3;padding:3px 10px;border-radius:99px;font-size:12px;margin-top:8px}</style></head>
<body><div class="wrap" id="app"><p>Đang giải mã dữ liệu…</p></div>
<script>
var CIPHER=${c};var KEY=${k};
function dec(c,key){var d=atob(c),k=new TextEncoder().encode(key),o=new Uint8Array(d.length);for(var i=0;i<d.length;i++)o[i]=d.charCodeAt(i)^k[i%k.length];return new TextDecoder().decode(o)}
function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function m(n){return new Intl.NumberFormat("vi-VN").format(Math.round(n||0))+"đ"}
function dt(s){if(!s)return"";var p=s.slice(0,10).split("-");return p[2]+"/"+p[1]+"/"+p[0]}
var app=document.getElementById("app");
try{var D=JSON.parse(dec(CIPHER,KEY));render()}catch(e){app.innerHTML="<p>Không đọc được dữ liệu.</p>"}
function render(){var M=D.metrics;
var cards=[["Số phiếu",M.count,1],["Doanh thu thuần",M.net],["Đã thu",M.collected],["Còn phải thu",M.outstanding]];
var h='<div class="hero"><h1>Vietcasa — Dashboard offline</h1><div class="muted">Bản chỉ đọc · Xuất lúc '+esc(new Date(D.exportedAt).toLocaleString("vi-VN"))+'</div><div class="muted" style="margin-top:16px">Tổng doanh số</div><div class="big">'+m(M.gross)+'</div><span class="badge">'+M.count+' phiếu</span></div>';
h+='<div class="grid">'+cards.map(function(c){return '<div class="card"><div class="muted">'+c[0]+'</div><div class="v">'+(c[2]?c[1]:m(c[1]))+'</div></div>'}).join("")+'</div>';
h+='<div class="grid"><div class="card"><h2>Chi tiết chi phí</h2>'+D.costs.map(function(c){return '<div class="row">'+esc(c.label)+' <b>'+m(c.amount)+' · '+(c.pct||0).toFixed(1)+'%</b><div class="bar"><i style="width:'+Math.min(100,c.pct||0)+'%"></i></div></div>'}).join("")+'</div>';
h+='<div class="card tbl"><h2>Theo nhân viên</h2><table><tr><th>Nhân viên</th><th>Team</th><th>Phiếu</th><th>Doanh số</th><th>Còn phải thu</th></tr>'+D.byEmployee.map(function(e){return '<tr><td>'+esc(e.name)+'</td><td>'+esc(e.team)+'</td><td class="n">'+e.count+'</td><td class="n">'+m(e.gross)+'</td><td class="n">'+m(e.outstanding)+'</td></tr>'}).join("")+'</table></div></div>';
h+='<div class="card tbl"><h2>Phiếu doanh số</h2><input id="q" placeholder="Tìm khách hàng, công trình, số phiếu…"><div id="rec"></div></div>';
app.innerHTML=h;var q=document.getElementById("q");q.oninput=rec;rec();}
function rec(){var t=document.getElementById("q").value.toLowerCase();var rs=D.records.filter(function(r){return !t||(r.voucher+" "+r.customer+" "+r.project+" "+r.employee).toLowerCase().indexOf(t)>-1});
document.getElementById("rec").innerHTML='<table><tr><th>Ngày</th><th>Số phiếu</th><th>Nhân viên</th><th>Khách hàng</th><th>Công trình</th><th>Doanh số</th><th>Thuần</th><th>Còn nợ</th><th>Trạng thái</th><th>Hạn</th></tr>'+rs.map(function(r){return '<tr><td>'+dt(r.date)+'</td><td>'+esc(r.voucher)+'</td><td>'+esc(r.employee)+'</td><td>'+esc(r.customer)+'</td><td>'+esc(r.project)+'</td><td class="n">'+m(r.gross)+'</td><td class="n">'+m(r.net)+'</td><td class="n">'+m(r.outstanding)+'</td><td>'+esc(r.status)+'</td><td>'+dt(r.due)+'</td></tr>'}).join("")+'</table>'}
</script></body></html>`;
}
