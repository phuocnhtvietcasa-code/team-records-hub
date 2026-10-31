import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Clock, Wallet } from "lucide-react";
import { AnimatedNumber, percentNumber, useChartAnimation } from "@/components/dashboard/animation";
import { useFilters } from "@/lib/filters";
import { useFilteredRecords } from "@/lib/use-filtered";
import { useMe, type SalesRecord } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { RecordForm, type FormValues } from "@/components/RecordForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { agingBucket, collected, daysOwed, debtWarning, formatDateVN, formatVND, outstanding, PERIOD_LABELS } from "@/lib/finance";
import { shortMoney } from "@/components/dashboard/ui";
import { DashboardFrame, DashboardHero, DashboardRing, REVENUE_COLORS, RevenueMetric, RevenueProgress, RevenueSection, Sparkline } from "@/components/dashboard/revenue-ui";
import { buildTrend } from "@/components/dashboard/trend";
import { cn } from "@/lib/utils";
import { DebtDetails } from "@/components/dashboard/debt-details";

export const Route = createFileRoute("/_authenticated/dashboard-cong-no")({
  head: () => ({
    meta: [
      { title: "Dashboard Công nợ — Vietcasa" },
      { name: "description", content: "Công nợ phải thu, quá hạn và tuổi nợ Vietcasa." },
      { property: "og:title", content: "Dashboard Công nợ — Vietcasa" },
      { property: "og:description", content: "Công nợ phải thu, quá hạn và tuổi nợ Vietcasa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DebtDashboard,
});

function DebtDashboard() {
  const animation = useChartAnimation();
  const { filtered, scope, employees, empMap, today, loading } = useFilteredRecords();
  const { period } = useFilters();

  const s = useMemo(() => {
    const buckets = { safe: 0, soon: 0, overdue: 0 };
    const aging = { "0-30": 0, "31-60": 0, ">60": 0 };
    let debt = 0;
    let paid = 0;
    for (const r of filtered) {
      paid += collected(r);
      const o = outstanding(r);
      if (o <= 0) continue;
      debt += o;
      buckets[debtWarning(r, today)] += o;
      aging[agingBucket(daysOwed(r, today) ?? 0)] += o;
    }
    const perEmp = scope.map((e) => {
      const rs = filtered.filter((r) => r.employee_id === e.id);
      return {
        name: e.full_name.split(" ").slice(-2).join(" "),
        collected: rs.reduce((a, r) => a + collected(r), 0),
        debt: rs.reduce((a, r) => a + outstanding(r), 0),
      };
    });
    const alerts = filtered.filter((r) => outstanding(r) > 0 && debtWarning(r, today) !== "safe").sort((a, b) => a.due_date.localeCompare(b.due_date));
    return { buckets, aging, debt, paid, perEmp, alerts };
  }, [filtered, scope, today]);

  const pie = [
    { name: "Trong hạn", value: s.buckets.safe, color: REVENUE_COLORS[1] },
    { name: "Sắp đến hạn (<7 ngày)", value: s.buckets.soon, color: REVENUE_COLORS[3] },
    { name: "Quá hạn", value: s.buckets.overdue, color: "var(--color-destructive)" },
  ];
  const agingData = [
    { label: "0–30 ngày", value: s.aging["0-30"], color: REVENUE_COLORS[0] },
    { label: "31–60 ngày", value: s.aging["31-60"], color: REVENUE_COLORS[3] },
    { label: "> 60 ngày", value: s.aging[">60"], color: "var(--color-destructive)" },
  ];

  const display = useMemo(() => ({
    debt: buildTrend(filtered, period, today, outstanding),
    paid: buildTrend(filtered, period, today, collected),
    overdue: buildTrend(filtered, period, today, (r) => debtWarning(r, today) === "overdue" ? outstanding(r) : 0),
    soon: buildTrend(filtered, period, today, (r) => debtWarning(r, today) === "soon" ? outstanding(r) : 0),
  }), [filtered, period, today]);
  const total = s.debt + s.paid;
  const paidPct = total > 0 ? s.paid / total * 100 : 0;
  const scopeLabel = scope.length === 1 ? scope[0]?.full_name : `${scope.length} nhân viên`;
  const chartTooltip = <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)", fontSize: 12 }} formatter={(v: number) => formatVND(v)} />;

  return (
    <DashboardFrame title="Dashboard Công nợ" subtitle={`${scopeLabel} · ${PERIOD_LABELS[period]}${period === "week" ? " (Thứ 2 – Thứ 7)" : ""}`} today={today}>
      {loading ? <p className="py-12 text-muted-foreground">Đang tải dữ liệu...</p> : <>
        <DashboardHero label="Tổng quan công nợ">
          <div className="min-w-0"><p className="text-xs font-semibold uppercase">Tổng công nợ phải thu · {PERIOD_LABELS[period]}</p><p data-testid="debt-total" className="mt-3 break-words text-3xl font-bold tabular-nums sm:text-4xl"><AnimatedNumber value={s.debt} /></p><p className="mt-4 text-xs text-revenue-hero-foreground/70">{scopeLabel}</p><div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2"><div><p className="break-words text-xl font-semibold"><AnimatedNumber value={s.paid} /></p><p className="mt-1 text-xs text-revenue-hero-foreground/70">Đã thu</p></div><div><p className="break-words text-xl font-semibold"><AnimatedNumber value={s.buckets.overdue} /></p><p className="mt-1 text-xs text-revenue-hero-foreground/70">Quá hạn</p></div></div></div>
          <div className="min-w-0 border-y border-revenue-hero-foreground/15 py-4 xl:border-y-0 xl:py-0"><div className="mb-3 flex justify-between gap-3 text-xs text-revenue-hero-foreground/75"><span>Công nợ theo ngày lập phiếu</span><span>{PERIOD_LABELS[period]}</span></div><Sparkline data={display.debt} color="var(--revenue-hero-foreground)" large /><div className="mt-3 flex justify-between text-[10px] text-revenue-hero-foreground/60"><span>{display.debt[0]?.label ?? "—"}</span><span>{display.debt.at(-1)?.label ?? "—"}</span></div></div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 xl:flex xl:flex-col xl:text-center"><DashboardRing pct={paidPct} hasValue={total > 0} label="tỷ lệ đã thu" /><div><p className="text-xs font-medium">Đã thu / Tổng giá trị phiếu</p><p className="mt-2 break-words text-sm font-semibold"><AnimatedNumber value={total} /></p></div></div>
        </DashboardHero>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <RevenueMetric icon={Wallet} label="Tổng công nợ phải thu" value={<AnimatedNumber value={s.debt} />} data={display.debt} color={REVENUE_COLORS[0]} hint="Còn phải thu" />
          <RevenueMetric icon={CheckCircle2} label="Đã thu" value={<AnimatedNumber value={s.paid} />} data={display.paid} color={REVENUE_COLORS[1]} hint="Giá trị đã thanh toán" />
          <RevenueMetric icon={AlertTriangle} label="Quá hạn" value={<AnimatedNumber value={s.buckets.overdue} />} data={display.overdue} color="var(--destructive)" hint="Công nợ quá hạn thanh toán" />
          <RevenueMetric icon={Clock} label="Sắp đến hạn (<7 ngày)" value={<AnimatedNumber value={s.buckets.soon} />} data={display.soon} color={REVENUE_COLORS[3]} hint="Cần theo dõi thanh toán" />
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <RevenueSection title="Tuổi nợ" className="xl:col-span-2"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={agingData} margin={{ top: 12, right: 0, left: -14, bottom: 0 }}><CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} /><XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} /><YAxis tickFormatter={shortMoney} fontSize={10} tickLine={false} axisLine={false} />{chartTooltip}<Bar {...animation} dataKey="value" name="Còn nợ" maxBarSize={52} radius={[6, 6, 0, 0]}>{agingData.map((a) => <Cell key={a.label} fill={a.color} />)}</Bar></BarChart></ResponsiveContainer></div><ul className="mt-5 space-y-4 border-t pt-5">{agingData.map((a) => <li key={a.label} className="grid grid-cols-[1fr_auto] gap-2"><span className="text-xs">{a.label}</span><span className="text-xs font-semibold"><AnimatedNumber value={a.value} /></span><div className="col-span-2"><RevenueProgress pct={s.debt > 0 ? a.value / s.debt * 100 : 0} color={a.color} label={a.label} /></div></li>)}</ul></RevenueSection>
          <RevenueSection title="Cơ cấu công nợ"><div className="relative mx-auto h-56 max-w-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie {...animation} data={s.debt > 0 ? pie : [{ name: "Chưa có công nợ", value: 1, color: "var(--muted)" }]} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="90%" paddingAngle={3} stroke="var(--card)">{(s.debt > 0 ? pie : [{ name: "Trống", color: "var(--muted)" }]).map((p) => <Cell key={p.name} fill={p.color} />)}</Pie>{s.debt > 0 && chartTooltip}</PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[11px] text-muted-foreground">Còn phải thu</span><span className="mt-1 text-xl font-bold"><AnimatedNumber value={s.debt} format={shortMoney} /></span></div></div><ul className="mt-5 space-y-5">{pie.map((p) => <li key={p.name}><div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2"><span className="size-2 rounded-sm" style={{ background: p.color }} />{p.name}</span><span className="font-semibold"><AnimatedNumber value={p.value} format={shortMoney} /> <span className="ml-2 font-normal text-muted-foreground"><AnimatedNumber value={s.debt > 0 ? p.value / s.debt * 100 : 0} format={percentNumber} /></span></span></div><RevenueProgress pct={s.debt > 0 ? p.value / s.debt * 100 : 0} color={p.color} label={p.name} /></li>)}</ul></RevenueSection>
        </div>
        <RevenueSection title="Đã thu vs Còn nợ theo nhân viên"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={s.perEmp} margin={{ top: 12, right: 0, left: -14, bottom: 0 }}><CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} /><XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} /><YAxis tickFormatter={shortMoney} fontSize={10} tickLine={false} axisLine={false} />{chartTooltip}<Legend wrapperStyle={{ fontSize: 11 }} /><Bar {...animation} dataKey="collected" stackId="a" name="Đã thu" fill={REVENUE_COLORS[1]} maxBarSize={48} /><Bar {...animation} dataKey="debt" stackId="a" name="Còn nợ" fill={REVENUE_COLORS[0]} maxBarSize={48} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></RevenueSection>
        <DebtDetails records={filtered} employees={employees} empMap={empMap} />
        <RevenueSection title={`Cảnh báo công nợ (${s.alerts.length})`} aside={<Clock className="size-4 text-revenue-gold" />}>
          <ul className="max-h-[32rem] divide-y overflow-y-auto pr-1">{s.alerts.map((r) => { const w = debtWarning(r, today); const amount = outstanding(r); return <li key={r.id} className="grid gap-4 py-5 lg:grid-cols-[1.2fr_1fr_1fr] lg:items-center"><div className="min-w-0"><p className="break-words text-sm font-semibold">{r.voucher_no}</p><p className="mt-2 break-words text-xs text-muted-foreground">{r.customer || "Chưa có khách hàng"} · {empMap.get(r.employee_id)?.full_name}</p></div><div><span className={cn("inline-block rounded-full px-3 py-1 text-[10px] font-medium", w === "overdue" ? "bg-destructive/10 text-destructive" : "bg-revenue-gold/15 text-warning-foreground")}>{w === "overdue" ? "Quá hạn" : "Sắp đến hạn"} · {formatDateVN(r.due_date)}</span><p className="mt-2 text-[10px] text-muted-foreground">{daysOwed(r, today)} ngày nợ</p></div><div><p className="mb-3 text-sm font-semibold tabular-nums lg:text-right"><AnimatedNumber value={amount} /></p><RevenueProgress pct={r.gross > 0 ? amount / r.gross * 100 : 0} color={w === "overdue" ? "var(--destructive)" : REVENUE_COLORS[3]} label={`Còn nợ ${r.voucher_no}`} /></div></li>; })}</ul>
          {s.alerts.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Không có khoản nợ cần cảnh báo.</p>}
        </RevenueSection>
      </>}
    </DashboardFrame>
  );
}
