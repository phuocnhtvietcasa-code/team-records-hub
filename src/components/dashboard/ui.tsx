import { ResponsiveContainer } from "recharts";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "brand" | "dark" | "success" | "warning" | "danger" | "info";

const TONE: Record<Tone, { bar: string; icon: string }> = {
  brand: { bar: "bg-primary", icon: "bg-primary/12 text-primary" },
  dark: { bar: "bg-sidebar", icon: "bg-sidebar/10 text-sidebar" },
  success: { bar: "bg-success", icon: "bg-success/12 text-success" },
  warning: { bar: "bg-warning", icon: "bg-warning/20 text-warning-foreground" },
  danger: { bar: "bg-destructive", icon: "bg-destructive/12 text-destructive" },
  info: { bar: "bg-info", icon: "bg-info/12 text-info" },
};

export function Kpi({ icon: Icon, label, value, hint, tone = "brand" }: { icon: LucideIcon; label: string; value: string; hint?: React.ReactNode; tone?: Tone }) {
  const t = TONE[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-card transition-transform hover:-translate-y-0.5">
      <span className={cn("absolute inset-x-0 top-0 h-1", t.bar)} />
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", t.icon)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ChartCard({ title, children, className }: { title: string; children: React.ReactElement; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-card", className)}>
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <span className="h-4 w-1 rounded-full bg-primary" />
        {title}
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

export function Panel({ title, icon: Icon, children, className }: { title: string; icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-card", className)}>
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h3>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-dark-gradient p-6 text-sidebar-foreground shadow-card">
      <div className="absolute -right-10 -top-10 h-48 w-48 rotate-12 bg-brand-gradient opacity-80 [clip-path:polygon(25%_0,100%_0,75%_100%,0_100%)]" />
      <div className="relative grid min-w-0 gap-4 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-sidebar-foreground/70">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export const shortMoney = (n: number) => `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}tr`;
