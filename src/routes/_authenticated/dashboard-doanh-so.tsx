import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownToLine, ArrowUpFromLine, FileText, Target, Trophy } from "lucide-react";
import { AnimatedNumber, integerNumber, percentNumber, useChartAnimation } from "@/components/dashboard/animation";
import { useFilters } from "@/lib/filters";
import { useKpiTargets, useMe, useRecords } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useFilteredRecords } from "@/lib/use-filtered";
import { companyNet, companyRevenue, costBreakdown, formatVND, kpiStatus, monthlyKpi, netRevenue, periodKpi, PERIOD_LABELS } from "@/lib/finance";
import { shortMoney } from "@/components/dashboard/ui";
import { DashboardFrame, DashboardHero, DashboardRing, COST_COLORS, KPI_STATUS_COLOR, KpiStatusBadge, REVENUE_COLORS, RevenueMetric, RevenueProgress, RevenueSection, Sparkline, TrendBadge } from "@/components/dashboard/revenue-ui";
import { buildTrend } from "@/components/dashboard/trend";
import { cn } from "@/lib/utils";
import { NATURE_LABELS } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/dashboard-doanh-so")({
  head: () => ({
    meta: [
      { title: "Dashboard Doanh số — Vietcasa" },
      { name: "description", content: "Doanh số, mục tiêu KPI và xếp hạng nhân viên Vietcasa." },
      { property: "og:title", content: "Dashboard Doanh số — Vietcasa" },
      { property: "og:description", content: "Doanh số, mục tiêu KPI và xếp hạng nhân viên Vietcasa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesDashboard,
});

function SalesDashboard() {
  const animation = useChartAnimation();
  const { filtered, scope, today, loading } = useFilteredRecords();
  const { employeeIds, period, sub } = useFilters();
  const { canManage } = useMe();
  const { data: targets = [], isLoading: targetsLoading, isError: targetsError } = useKpiTargets();
  const { data: allRecords = [] } = useRecords();
  const [year, setYear] = useState(today.getFullYear());
  const companyView = canManage && employeeIds === null;
  const costs = useMemo(() => costBreakdown(filtered), [filtered]);

  const s = useMemo(() => {
    const credit = companyView ? companyNet : netRevenue;
    const sales = filtered.reduce((a, r) => a + credit(r), 0);
    const target = companyView ? periodKpi(targets, null, period, today, 0, sub) : scope.reduce((a, e) => a + periodKpi(targets, e.id, period, today, e.monthly_target, sub), 0);
    const perEmp = scope
      .map((e) => {
        const rs = filtered.filter((r) => r.employee_id === e.id);
        const sales = rs.reduce((a, r) => a + netRevenue(r), 0);
        const target = periodKpi(targets, e.id, period, today, e.monthly_target, sub);
        return { name: e.full_name.split(" ").slice(-2).join(" "), full: e.full_name, sales, target, count: rs.length, pct: target > 0 ? (sales / target) * 100 : 0 };
      })
      .sort((a, b) => b.sales - a.sales);
    return { sales, target, perEmp, trend: buildTrend(filtered, period, today, credit, sub) };
  }, [filtered, scope, period, sub, today, targets, companyView]);

  const annual = useMemo(() => {
    const ids = new Set(scope.map((e) => e.id));
    const records = allRecords.filter((r) => Number(r.record_date.slice(0, 4)) === year && (companyView || ids.has(r.employee_id)));
    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const sales = records.filter((r) => Number(r.record_date.slice(5, 7)) === month).reduce((a, r) => a + (companyView ? companyNet(r) : netRevenue(r)), 0);
      const target = companyView ? monthlyKpi(targets, null, year, month) : scope.reduce((a, e) => a + monthlyKpi(targets, e.id, year, month, e.monthly_target), 0);
      return { label: `T${month}`, sales, target };
    });
    const sales = months.reduce((sum, m) => sum + m.sales, 0);
    const target = months.reduce((sum, m) => sum + m.target, 0);
    const pct = target > 0 ? (sales / target) * 100 : 0;
    return { months, sales, target, pct, pie: [{ name: "Đã đạt", value: Math.max(sales, 0) }, { name: "Còn thiếu", value: Math.max(target - Math.max(sales, 0), 0) }] };
  }, [allRecords, year, companyView, scope, targets]);

  const pct = s.target > 0 ? (s.sales / s.target) * 100 : 0;
  const status = kpiStatus(pct);

  const display = useMemo(() => {
    const grossTrend = buildTrend(filtered, period, today, (r) => r.gross, sub);
    const countTrend = buildTrend(filtered, period, today, () => 1, sub);
    const trend = grossTrend.map((point) => ({ label: point.label, gross: point.value, net: s.trend.find((p) => p.label === point.label)?.value ?? 0 }));
    const group = (key: "customer" | "project" | "nature") => {
      const totals = new Map<string, number>();
      for (const record of filtered) {
        const name = key === "nature" ? NATURE_LABELS[record.nature as keyof typeof NATURE_LABELS] ?? record.nature : record[key].trim();
        const label = name || "Chưa phân loại";
        // Công trình/Khách hàng: tổng DT thuần nhân viên + DT thuần công ty; loại phiếu giữ doanh số gốc.
        const amount = key === "nature" ? record.gross : netRevenue(record) + companyRevenue(record);
        totals.set(label, (totals.get(label) ?? 0) + amount);
      }
      return [...totals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    };
    return { grossTrend, countTrend, trend, customers: group("customer"), projects: group("project"), groups: group("nature") };
  }, [filtered, period, sub, today, s.trend]);
  const scopeLabel = companyView ? "Tổng công ty" : scope.length === 1 ? scope[0]?.full_name : `${scope.length} nhân viên`;
  const netLabel = companyView ? "DT thuần Công ty" : "DT thuần nhân viên";

  return (
    <DashboardFrame title="Dashboard Doanh thu" subtitle={`${scopeLabel} · ${PERIOD_LABELS[period]}${period === "week" ? " (Thứ 2 – Thứ 7)" : ""}`} today={today}>
      {targetsError && <p className="text-destructive">Không tải được KPI. Vui lòng thử lại.</p>}
      {loading || targetsLoading ? <p className="py-12 text-muted-foreground">Đang tải dữ liệu...</p> : <>
        <DashboardHero label="Tổng quan doanh thu">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase">{netLabel} · {PERIOD_LABELS[period]}</p>
            <p data-testid="revenue-total" className="mt-3 break-words text-3xl font-bold tabular-nums sm:text-4xl">{<AnimatedNumber value={s.sales} />}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2"><TrendBadge data={s.trend} /><span className="text-[11px] text-revenue-hero-foreground/70">{s.trend.length > 1 ? `${s.trend.at(-1)?.label} so với ${s.trend.at(-2)?.label}` : "Chưa đủ dữ liệu so sánh"}</span></div>
            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2"><div><p className="text-xl font-semibold tabular-nums">{<AnimatedNumber value={filtered.length} format={integerNumber} />}</p><p className="mt-1 text-xs text-revenue-hero-foreground/70">Phiếu doanh số</p></div><div><p className="break-words text-xl font-semibold tabular-nums">{<AnimatedNumber value={costs.gross} />}</p><p className="mt-1 text-xs text-revenue-hero-foreground/70">Tổng doanh số gốc</p></div></div>
          </div>
          <div className="min-w-0 border-y border-revenue-hero-foreground/15 py-4 xl:border-y-0 xl:py-0"><div className="mb-3 flex items-center justify-between gap-3 text-xs text-revenue-hero-foreground/75"><span>Doanh thu trong kỳ</span><span>{PERIOD_LABELS[period]}</span></div><Sparkline data={s.trend} color="var(--revenue-hero-foreground)" large /><div className="mt-3 flex justify-between text-[10px] text-revenue-hero-foreground/60"><span>{s.trend[0]?.label ?? "—"}</span><span>{s.trend.at(-1)?.label ?? "—"}</span></div></div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 xl:flex xl:flex-col xl:text-center"><DashboardRing pct={pct} hasValue={s.target > 0} color={s.target > 0 ? KPI_STATUS_COLOR[status] : undefined} label="hoàn thành KPI" /><div className="flex flex-col items-start gap-2 xl:items-center"><p className="text-xs font-medium">{s.target > 0 ? "Mục tiêu KPI" : "Chưa đặt KPI"}</p><p className="break-words text-sm font-semibold tabular-nums">{<AnimatedNumber value={s.target} />}</p><KpiStatusBadge pct={pct} hasValue={s.target > 0} /></div></div>
        </DashboardHero>

        <div className="grid gap-5 md:grid-cols-3">
          <RevenueMetric icon={ArrowUpFromLine} label="Tổng doanh số gốc" value={<AnimatedNumber value={costs.gross} />} data={display.grossTrend} color={REVENUE_COLORS[0]} hint={comparisonHint(display.grossTrend)} />
          <RevenueMetric icon={ArrowDownToLine} label={netLabel} value={<AnimatedNumber value={s.sales} />} data={s.trend} color={REVENUE_COLORS[1]} hint={comparisonHint(s.trend)} />
          <RevenueMetric icon={FileText} label="Số phiếu doanh số" value={<AnimatedNumber value={filtered.length} format={integerNumber} />} data={display.countTrend} color={REVENUE_COLORS[2]} hint={comparisonHint(display.countTrend)} />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <RevenueSection title="Xu hướng doanh thu" className="xl:col-span-2" aside={<div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground"><LegendDot color={REVENUE_COLORS[0]} label="Doanh số gốc" /><LegendDot color={REVENUE_COLORS[1]} label={netLabel} /></div>}>
            <div className="mb-5 flex flex-wrap gap-8 border-b pb-5"><Summary label="Tổng doanh số gốc" value={<AnimatedNumber value={costs.gross} />} /><Summary label={netLabel} value={<AnimatedNumber value={s.sales} />} /></div>
            <div className="h-72 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={display.trend} margin={{ top: 12, right: 0, left: -14, bottom: 4 }} barGap={4}><CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} /><XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} tick={{ fill: "var(--muted-foreground)" }} /><YAxis tickFormatter={shortMoney} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)" }} /><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatVND(v)} cursor={{ fill: "var(--muted)" }} /><Bar {...animation} dataKey="gross" name="Doanh số gốc" fill={REVENUE_COLORS[0]} maxBarSize={20} radius={[4, 4, 0, 0]} /><Bar {...animation} dataKey="net" name={netLabel} fill={REVENUE_COLORS[1]} maxBarSize={20} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            {display.trend.length === 0 && <p className="text-center text-xs text-muted-foreground">Chưa có doanh thu trong kỳ.</p>}
          </RevenueSection>
          <RevenueSection title="Mức hoàn thành KPI">
            <div className="py-4 text-center"><p className="text-4xl font-bold" style={s.target > 0 ? { color: KPI_STATUS_COLOR[status] } : undefined}>{s.target > 0 ? <AnimatedNumber value={pct} format={percentNumber} /> : "—"}</p><div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"><span>{s.target > 0 ? "Hoàn thành mục tiêu" : "Chưa đặt KPI"}</span><KpiStatusBadge pct={pct} hasValue={s.target > 0} /></div></div>
            <div className="my-6"><RevenueProgress pct={pct} color={s.target > 0 ? KPI_STATUS_COLOR[status] : REVENUE_COLORS[0]} label="Mức hoàn thành KPI" /></div>
            <dl className="divide-y text-xs"><Detail label="Thực tế" value={<AnimatedNumber value={s.sales} />} /><Detail label="Mục tiêu (KPI)" value={<AnimatedNumber value={s.target} />} /><Detail label={s.sales >= s.target ? "Vượt mục tiêu" : "Còn thiếu"} value={s.target > 0 ? formatVND(Math.abs(s.sales - s.target)) : "—"} positive={s.target > 0 && s.sales >= s.target} /></dl>
            <div className="mt-5 flex items-center gap-2 rounded-lg bg-muted px-3 py-3 text-xs text-muted-foreground"><Target className="size-4 shrink-0 text-revenue" /><span>{scopeLabel}</span></div>
          </RevenueSection>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <RevenueSection title="Chi tiết chi phí" className="xl:col-span-2" aside={<span className="text-[10px] text-muted-foreground">% doanh số gốc</span>}>
            <ul className="divide-y">{costs.items.map((item, i) => <li key={item.key} className="grid gap-3 py-4 sm:grid-cols-[1.25fr_1fr_1fr] sm:items-center"><span className="flex items-center gap-2 text-xs font-medium"><span className="size-2 shrink-0 rounded-sm" style={{ background: COST_COLORS[i] }} />{item.label}</span><span className="text-sm font-semibold tabular-nums sm:text-right">{formatVND(item.amount)}</span><div className="flex items-center gap-3"><span className="w-12 shrink-0 text-right text-xs tabular-nums"><AnimatedNumber value={item.pct} format={percentNumber} /></span><div className="flex-1"><RevenueProgress pct={item.pct} color={COST_COLORS[i] ?? COST_COLORS[0]} label={item.label} /></div></div></li>)}</ul>
            <div className="mt-2 flex flex-wrap justify-between gap-3 border-t pt-5 text-sm font-semibold"><span>Tổng chi phí</span><span className="tabular-nums">{formatVND(costs.total)} <span className="ml-3 text-xs font-normal text-muted-foreground">{(costs.gross > 0 ? costs.total / costs.gross * 100 : 0).toFixed(1)}%</span></span></div>
          </RevenueSection>
          <RevenueSection title="Doanh số theo loại phiếu">
            <div className="relative mx-auto h-56 max-w-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie {...animation} data={display.groups.length ? display.groups : [{ name: "Chưa có dữ liệu", value: 1 }]} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="90%" paddingAngle={2} stroke="var(--card)">{(display.groups.length ? display.groups : [null]).map((_, i) => <Cell key={i} fill={display.groups.length ? (REVENUE_COLORS[i % REVENUE_COLORS.length] ?? REVENUE_COLORS[0]) : "var(--muted)"} />)}</Pie>{display.groups.length > 0 && <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatVND(v)} />}</PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[11px] text-muted-foreground">Doanh số gốc</span><span className="mt-1 text-xl font-bold">{shortMoney(costs.gross)}</span></div></div>
            <ul className="mt-4 space-y-4">{display.groups.map((g, i) => <li key={g.name} className="flex items-center justify-between gap-3 text-xs"><LegendDot label={g.name} color={(REVENUE_COLORS[i % REVENUE_COLORS.length] ?? REVENUE_COLORS[0])} /><span className="shrink-0 font-semibold">{shortMoney(g.value)} <span className="ml-2 font-normal text-muted-foreground">{(costs.gross > 0 ? g.value / costs.gross * 100 : 0).toFixed(1)}%</span></span></li>)}</ul>
          </RevenueSection>
        </div>
        <div className="grid gap-5 lg:grid-cols-2"><RevenueSection title="Doanh số theo công trình"><RankingList rows={display.projects} total={costs.gross} colors={[REVENUE_COLORS[0], REVENUE_COLORS[2]]} /></RevenueSection><RevenueSection title="Doanh số theo khách hàng"><RankingList rows={display.customers} total={costs.gross} colors={[REVENUE_COLORS[1], REVENUE_COLORS[4]]} /></RevenueSection></div>

        <RevenueSection title="Xếp hạng nhân viên" aside={<Trophy className="size-4 text-revenue-gold" />}>
          <ul className="divide-y">{s.perEmp.map((e, i) => <li key={e.full} className="grid gap-4 py-4 sm:grid-cols-[1fr_1fr] lg:grid-cols-[1.2fr_1fr_1fr] lg:items-center"><div className="flex min-w-0 items-center gap-3"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold", i === 0 ? "bg-revenue/10 text-revenue" : "bg-muted text-muted-foreground")}>{String(i + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="break-words text-xs font-semibold">{e.full}</p><p className="mt-1 text-[10px] text-muted-foreground">{e.count} phiếu · Mục tiêu {formatVND(e.target)}</p></div></div><p className="text-sm font-semibold tabular-nums sm:text-right">{formatVND(e.sales)}</p><div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-1"><div className="min-w-16 flex-1"><RevenueProgress pct={e.pct} color={e.target > 0 ? KPI_STATUS_COLOR[kpiStatus(e.pct)] : "var(--muted)"} label={`KPI ${e.full}`} /></div><span className="w-12 text-right text-xs font-semibold tabular-nums" style={e.target > 0 ? { color: KPI_STATUS_COLOR[kpiStatus(e.pct)] } : undefined}>{e.target > 0 ? `${e.pct.toFixed(0)}%` : "—"}</span><KpiStatusBadge pct={e.pct} hasValue={e.target > 0} /></div></li>)}</ul>
          {s.perEmp.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Chưa chọn nhân viên.</p>}
        </RevenueSection>

        <div className="space-y-5 border-t pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">KPI năm · {year}</h2><p className="mt-1 text-xs text-muted-foreground">{scopeLabel}</p></div><div className="flex items-center gap-2"><Label htmlFor="sales-kpi-year" className="text-xs">Năm</Label><Input id="sales-kpi-year" type="number" min={2000} max={2200} className="w-24 bg-card" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div></div>
          <div className="grid gap-5 xl:grid-cols-3">
            <RevenueSection title={`Doanh thu thuần & KPI · 12 tháng năm ${year}`} className="xl:col-span-2"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={annual.months} margin={{ top: 12, right: 0, left: -14, bottom: 0 }}><CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} /><XAxis dataKey="label" interval={0} fontSize={10} tickLine={false} axisLine={false} /><YAxis tickFormatter={shortMoney} fontSize={10} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatVND(v)} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar {...animation} dataKey="sales" name="DT thuần" fill={REVENUE_COLORS[0]} radius={[4, 4, 0, 0]} /><Bar {...animation} dataKey="target" name="KPI" fill={REVENUE_COLORS[1]} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></RevenueSection>
            <RevenueSection title={`Hoàn thành KPI năm ${year}`} aside={<KpiStatusBadge pct={annual.pct} hasValue={annual.target > 0} />}><div className="relative h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie {...animation} data={annual.pie.some((p) => p.value > 0) ? annual.pie : [{ name: "Chưa có dữ liệu", value: 1 }]} dataKey="value" nameKey="name" innerRadius={68} outerRadius={88} paddingAngle={3} stroke="var(--card)"><Cell fill={annual.sales > 0 ? KPI_STATUS_COLOR[kpiStatus(annual.pct)] : "var(--muted)"} /><Cell fill="var(--muted)" /></Pie>{annual.pie.some((p) => p.value > 0) && <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatVND(v)} />}</PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl font-bold" style={annual.target > 0 ? { color: KPI_STATUS_COLOR[kpiStatus(annual.pct)] } : undefined}>{annual.target > 0 ? <AnimatedNumber value={annual.pct} format={percentNumber} /> : "—"}</div></div><dl className="divide-y text-xs"><Detail label="DT thuần cả năm" value={formatVND(annual.sales)} /><Detail label="Mục tiêu cả năm" value={formatVND(annual.target)} /></dl></RevenueSection>
          </div>
        </div>
      </>}
    </DashboardFrame>
  );
}

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)", fontSize: 12 };

function comparisonHint(data: { label: string }[]) {
  return data.length > 1 ? `${data.at(-1)?.label} so với ${data.at(-2)?.label}` : "Chưa đủ dữ liệu so sánh";
}
function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="flex min-w-0 items-center gap-2"><span className="size-2 shrink-0 rounded-sm" style={{ background: color }} /><span className="break-words">{label}</span></span>;
}
function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-2 text-sm font-bold tabular-nums">{value}</p></div>;
}
function Detail({ label, value, positive = false }: { label: string; value: React.ReactNode; positive?: boolean }) {
  return <div className="flex items-center justify-between gap-3 py-3.5"><dt className="text-muted-foreground">{label}</dt><dd className={cn("text-right font-semibold tabular-nums", positive && "text-revenue-net")}>{value}</dd></div>;
}
function RankingList({ rows, total, colors }: { rows: { name: string; value: number }[]; total: number; colors: string[] }) {
  if (!rows.length) return <p className="py-6 text-center text-xs text-muted-foreground">Chưa có dữ liệu trong kỳ.</p>;
  return <ul className="max-h-80 space-y-5 overflow-y-auto pr-1">{rows.map((r, i) => { const pct = total > 0 ? r.value / total * 100 : 0; return <li key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2"><span className="min-w-0 break-words text-xs">{r.name}</span><span className="text-right text-xs font-semibold tabular-nums">{shortMoney(r.value)} <span className="ml-2 text-[10px] font-normal text-muted-foreground">{pct.toFixed(1)}%</span></span><div className="col-span-2"><RevenueProgress pct={pct} color={colors[i % colors.length] ?? REVENUE_COLORS[0]} label={r.name} /></div></li>; })}</ul>;
}
