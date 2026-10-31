import { PERIOD_LABELS, type Period } from "@/lib/finance";
import { useFilters } from "@/lib/filters";
import { useFilteredRecords } from "@/lib/use-filtered";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronDown, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FilterBar() {
  const { employeeIds, setEmployeeIds, period, setPeriod } = useFilters();
  const { availableEmployees: employees, scope } = useFilteredRecords();
  const [search, setSearch] = useState("");
  const all = employees.length > 0 && scope.length === employees.length;
  const shown = employees.filter((e) => `${e.full_name} ${e.code} ${e.team}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const label = employeeIds === null || all ? "Tất cả nhân viên" : scope.length === 1 ? scope[0]?.full_name : `${scope.length} nhân viên đã chọn`;
  function toggle(id: string, checked: boolean) {
    const ids = new Set(scope.map((e) => e.id));
    if (checked) ids.add(id); else ids.delete(id);
    setEmployeeIds(Array.from(ids));
  }

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-card">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-56 max-w-full justify-between text-foreground" aria-label="Lọc nhân viên">
            <Users className="h-4 w-4 shrink-0" /><span className="truncate">{label}</span><ChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] space-y-3">
          <Input aria-label="Tìm nhân viên" placeholder="Tìm nhân viên, Team..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="flex items-center justify-between border-b pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox aria-label="Chọn tất cả nhân viên" checked={all ? true : scope.length > 0 ? "indeterminate" : false} onCheckedChange={(checked) => setEmployeeIds(checked === true ? null : [])} />Chọn tất cả</label>
            <Button variant="ghost" size="sm" onClick={() => setEmployeeIds([])}>Bỏ chọn</Button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {shown.map((e) => <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted">
              <Checkbox aria-label={`Lọc ${e.full_name}`} checked={scope.some((s) => s.id === e.id)} onCheckedChange={(checked) => toggle(e.id, checked === true)} />
              <span className="min-w-0 text-sm"><span className="block break-words font-medium">{e.full_name}</span><span className="text-xs text-muted-foreground">{e.code}{e.team ? ` · ${e.team}` : ""}{e.team_role === "leader" ? " · Trưởng nhóm" : ""}</span></span>
            </label>)}
            {shown.length === 0 && <p className="py-3 text-sm text-muted-foreground">Không có nhân viên.</p>}
          </div>
        </PopoverContent>
      </Popover>
      <div className="grid w-full min-w-0 grid-cols-2 rounded-lg bg-muted p-1 sm:w-auto sm:grid-cols-5">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <Button
            variant="ghost"
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "h-10 min-w-0 rounded-md px-2 text-sm font-medium transition-colors last:col-span-2 sm:h-9 sm:px-3 sm:last:col-span-1",
              period === p ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {PERIOD_LABELS[p]}
          </Button>
        ))}
      </div>
    </div>
  );
}
