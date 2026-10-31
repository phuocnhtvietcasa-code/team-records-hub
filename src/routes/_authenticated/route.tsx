import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, LogOut, Menu, Settings, TrendingUp, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { useOfflineDownload } from "@/hooks/use-offline-download";
import { sessionExpiredByClose } from "@/lib/remember";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, ROLE_LABELS, useMe } from "@/lib/data";
import { FilterProvider } from "@/lib/filters";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (sessionExpiredByClose()) await supabase.auth.signOut();
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: Layout,
});

const NAV = [
  { to: "/dashboard-doanh-so", label: "Dashboard Doanh số", icon: TrendingUp },
  { to: "/dashboard-cong-no", label: "Dashboard Công nợ", icon: Wallet },
  { to: "/phieu", label: "Phiếu doanh số", icon: FileText },
] as const;

const SYSTEM_NAV = [
  { to: "/nhan-vien", label: "Nhân viên", icon: Users },
  { to: "/cai-dat", label: "Cài đặt & dữ liệu", icon: Settings },
] as const;


function Layout() {
  const { me, role, isAdmin } = useMe();
  const qc = useQueryClient();
  const { isExporting, download } = useOfflineDownload();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const navigation = (
    <>
          <div className="px-4 py-5">
            <div className="rounded-xl bg-card p-2.5 shadow-card"><BrandLogo className="w-full" /></div>
            <p className="mt-3 px-1 text-[11px] font-medium uppercase tracking-widest text-sidebar-foreground/50">Báo cáo kinh doanh</p>
          </div>
          <nav aria-label="Điều hướng chính" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                 onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: "!bg-brand-gradient !text-sidebar-primary-foreground font-medium shadow-card" }}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
            {isAdmin && (
              <>
                <p className="mt-4 px-3 text-[11px] font-medium uppercase tracking-widest text-sidebar-foreground/50">Hệ thống</p>
                {SYSTEM_NAV.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                     onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{ className: "!bg-brand-gradient !text-sidebar-primary-foreground font-medium shadow-card" }}
                  >
                    <n.icon className="h-4 w-4" /> {n.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="mt-auto px-4 pb-3 pt-4">
            <p className="text-xs leading-relaxed text-sidebar-foreground/40">
              Bản quyền thuộc Vietcasa
              <br />
              Lưu hành nội bộ
              <br />
              made by phuocnhtvietcasa
            </p>
          </div>
          <div className="border-t border-sidebar-border p-4">
            <p className="truncate text-sm font-medium">{me?.employee?.full_name ?? me?.email}</p>
            <p className="text-xs text-sidebar-primary">{ROLE_LABELS[role]}</p>
            <Button variant="ghost" onClick={signOut} className="mt-3 justify-start px-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <LogOut className="h-4 w-4" /> Đăng xuất
            </Button>
          </div>
    </>
  );

  return (
    <FilterProvider>
      <div className="app-layout min-h-dvh lg:flex">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-dark-gradient text-sidebar-foreground lg:flex">{navigation}</aside>
        <div className="min-w-0 flex-1">
          <header className="mobile-app-header sticky top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild><Button variant="outline" size="icon" aria-label="Mở menu" title="Mở menu" className="size-11 shrink-0"><Menu className="size-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="mobile-app-drawer flex h-dvh w-80 max-w-[85vw] flex-col gap-0 bg-dark-gradient p-0 text-sidebar-foreground">
                <SheetTitle className="sr-only">Menu Vietcasa</SheetTitle>
                <SheetDescription className="sr-only">Điều hướng và tài khoản Vietcasa</SheetDescription>
                {navigation}
              </SheetContent>
            </Sheet>
            <div className="min-w-0"><p className="truncate font-display text-sm font-semibold">Vietcasa DS-CN</p><p className="truncate text-xs text-muted-foreground">{me?.employee?.full_name ?? ROLE_LABELS[role]}</p></div>
            <BrandLogo className="w-24 shrink-0" />
          </header>
        <main className="app-main min-w-0 p-4 md:p-8">
          <div className="mb-4 flex min-w-0 justify-end">
            {isAdmin && (
              <Button className="ml-auto bg-foreground text-background hover:bg-foreground/90" onClick={download} disabled={isExporting} aria-busy={isExporting}>
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {isExporting ? "Đang tạo file..." : "Tải file HTML"}
              </Button>
            )}
          </div>
          <Outlet />
        </main>
        </div>
      </div>
    </FilterProvider>
  );
}
