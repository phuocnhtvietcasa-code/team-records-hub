import { formatDateVN, parseDate, weekDays, type Period } from "@/lib/finance";

const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Group values over time; week view always shows T2..T7 của tuần đang chọn. */
export function buildTrend<R extends { record_date: string }>(rows: R[], period: Period, today: Date, value: (r: R) => number, sub?: number | null) {
  if (period === "week") {
    const days = weekDays(today, sub);
    return days.map((d) => ({
      label: `${DOW[parseDate(d).getDay()]} ${formatDateVN(d).slice(0, 5)}`,
      value: rows.filter((r) => r.record_date === d).reduce((s, r) => s + value(r), 0),
    }));
  }
  const keyOf = (d: string) => {
    if (period === "month") return formatDateVN(d).slice(0, 5);
    if (period === "quarter") {
      const dt = parseDate(d);
      const mon = new Date(dt);
      mon.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
      return `${String(mon.getDate()).padStart(2, "0")}/${String(mon.getMonth() + 1).padStart(2, "0")}`;
    }
    return `T${Number(d.slice(5, 7))}/${d.slice(2, 4)}`;
  };
  const m = new Map<string, { sort: string; value: number }>();
  for (const r of rows) {
    const k = keyOf(r.record_date);
    const c = m.get(k);
    m.set(k, { sort: c && c.sort < r.record_date ? c.sort : r.record_date, value: (c?.value ?? 0) + value(r) });
  }
  return [...m.entries()].sort((a, b) => a[1].sort.localeCompare(b[1].sort)).map(([label, v]) => ({ label, value: v.value }));
}
