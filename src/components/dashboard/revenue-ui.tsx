import type { LucideIcon } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber, percentNumber, useChartAnimation } from "./animation";
import { FilterBar } from "@/components/FilterBar";
import { kpiStatus, KPI_STATUS_LABELS, type KpiStatus } from "@/lib/finance";

export const REVENUE_COLORS = ["var(--revenue)", "var(--revenue-net)", "var(--revenue-purple)", "var(--revenue-gold)", "var(--revenue-teal)"] as const;
export const COST_COLORS = ["var(--revenue-coral)", "var(--revenue-gold)", "var(--revenue-purple)", "var(--revenue-teal)", "var(--revenue)"] as const;

export function RevenueSection({ title, children, className, aside }: { title: string; children: React.ReactNode; className?: string; aside?: React.ReactNode }) {
  return <section className={cn("min-w-0 rounded-xl border bg-card p-4 shadow-revenue sm:p-6", className)}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold">{title}</h2>{aside}</div>{children}</section>;
}

export function Sparkline({ data, color, large = false }: { data: { value: number }[]; color: string; large?: boolean }) {
  const animation = useChartAnimation();
  const points = data.length === 1 ? [data[0], data[0]] : data;
  return <div className={large ? "h-36 w-full sm:h-40" : "h-12 w-full"} aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ top: 8, right: 1, bottom: 3, left: 1 }}><Line type="linear" dataKey="value" stroke={color} strokeWidth={large ? 3 : 2} dot={false} {...animation} /></LineChart></ResponsiveContainer></div>;
}

export function TrendBadge({ data }: { data: { label: string; value: number }[] }) {
  const current = data.at(-1);
  const previous = data.at(-2);
  if (!current || !previous || previous.value === 0) return <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">Chưa có đối chiếu</span>;
  const delta = (current.value - previous.value) / Math.abs(previous.value) * 100;
  return <span title={`${current.label} so với ${previous.label}`} className={cn("whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums", delta >= 0 ? "bg-revenue-net/10 text-revenue-net" : "bg-destructive/10 text-destructive")}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%</span>;
}

export function RevenueMetric({ icon: Icon, label, value, data, color, hint }: { icon: LucideIcon; label: string; value: React.ReactNode; data: { label: string; value: number }[]; color: string; hint: string }) {
  return <article className="relative min-w-0 overflow-hidden rounded-xl border bg-card shadow-revenue"><div className="p-5 pb-3 sm:p-6 sm:pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-muted" style={{ color }}><Icon className="size-4" /></span><h2 className="text-xs font-medium text-muted-foreground">{label}</h2></div><TrendBadge data={data} /></div><p className="mt-4 break-words text-2xl font-bold tabular-nums">{value}</p><p className="mt-2 text-[11px] text-muted-foreground">{hint}</p></div><Sparkline data={data} color={color} /></article>;
}

export function RevenueProgress({ pct, color, label }: { pct: number; color: string; label: string }) {
  const reduced = useReducedMotion();
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(pct, 100))} className="h-2 overflow-hidden rounded-full bg-muted"><motion.div initial={{ width: reduced ? `${Math.max(0, Math.min(pct, 100))}%` : "0%" }} animate={{ width: `${Math.max(0, Math.min(pct, 100))}%` }} transition={{ duration: reduced ? 0 : 0.85, ease: "easeOut" }} className="h-full rounded-full" style={{ background: color }} /></div>;
}

export function DashboardFrame({ title, subtitle, today, children }: { title: string; subtitle: string; today: Date; children: React.ReactNode }) {
  return <div className="sales-dashboard -m-4 min-w-0 min-h-dvh space-y-6 p-4 md:-m-8 md:p-8"><header className="grid min-w-0 gap-3 border-b pb-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between"><div className="min-w-0"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-xs text-muted-foreground">{subtitle}</p></div><span className="rounded-lg border bg-card px-4 py-2.5 text-xs text-muted-foreground">{today.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</span></header><div className="revenue-filters"><FilterBar /></div>{children}</div>;
}

export function DashboardHero({ children, label }: { children: React.ReactNode; label: string }) {
  return <section aria-label={label} className="bg-revenue-hero grid min-w-0 gap-8 rounded-2xl p-4 text-revenue-hero-foreground shadow-revenue sm:p-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)_180px] xl:items-center">{children}</section>;
}

export const KPI_STATUS_COLOR: Record<KpiStatus, string> = { missed: "var(--destructive)", near: "var(--warning)", achieved: "var(--success)" };

export function KpiStatusBadge({ pct, hasValue = true, className }: { pct: number; hasValue?: boolean; className?: string }) {
  if (!hasValue) return <span className={cn("rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground", className)}>Chưa đặt KPI</span>;
  const status = kpiStatus(pct);
  return <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", status === "missed" && "bg-destructive/10 text-destructive", status === "near" && "bg-warning/20 text-warning-foreground", status === "achieved" && "bg-success/10 text-success", className)}>{KPI_STATUS_LABELS[status]}</span>;
}

export function DashboardRing({ pct, hasValue = true, label, color }: { pct: number; hasValue?: boolean; label: string; color?: string | undefined }) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(pct, 100));
  return <div className="relative size-32 shrink-0" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped}><svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="none" stroke="var(--revenue-hero-foreground)" strokeOpacity="0.13" strokeWidth="10" /><motion.circle cx="60" cy="60" r="50" fill="none" stroke={color ?? "var(--revenue-net)"} strokeWidth="10" strokeLinecap={clamped > 0 ? "round" : "butt"} initial={{ strokeDasharray: reduced ? `${clamped / 100 * 314.16} 314.16` : "0 314.16" }} animate={{ strokeDasharray: `${clamped / 100 * 314.16} 314.16` }} transition={{ duration: reduced ? 0 : 0.95 }} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><p className="text-2xl font-bold">{hasValue ? <AnimatedNumber value={pct} format={percentNumber} /> : "—"}</p><p className="mt-1 text-[9px] text-revenue-hero-foreground/75">{label}</p></div></div>;
}