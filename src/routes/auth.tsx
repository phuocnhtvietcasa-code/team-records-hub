import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandLogo } from "@/components/Brand";
import { savedEmail, setRemember } from "@/lib/remember";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Đăng nhập — Vietcasa Báo cáo Doanh số & Công nợ" },
      { name: "description", content: "Đăng nhập hệ thống báo cáo doanh số và công nợ Vietcasa." },
      { property: "og:title", content: "Đăng nhập — Vietcasa Báo cáo Doanh số & Công nợ" },
      { property: "og:description", content: "Đăng nhập hệ thống báo cáo doanh số và công nợ Vietcasa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "in" | "up" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRem] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const e = savedEmail();
    if (e) setEmail(e);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra email.");
        setMode("in");
      } else if (mode === "in") {
        setRemember(remember, email);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard-doanh-so" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          setRemember(remember, email);
          navigate({ to: "/dashboard-doanh-so" });
        } else toast.success("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "in" ? "Đăng nhập" : mode === "up" ? "Tạo tài khoản" : "Quên mật khẩu";
  const sub =
    mode === "in" ? "Chào mừng trở lại với Vietcasa." : mode === "up" ? "Tài khoản đầu tiên sẽ là Admin." : "Nhập email, chúng tôi sẽ gửi link đặt lại mật khẩu.";

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-dark-gradient p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rotate-12 bg-brand-gradient opacity-90 [clip-path:polygon(25%_0,100%_0,75%_100%,0_100%)]" />
        <div className="absolute -bottom-32 left-10 h-80 w-80 rotate-12 bg-sidebar-accent opacity-60 [clip-path:polygon(25%_0,100%_0,75%_100%,0_100%)]" />
        <div className="relative w-64 rounded-2xl bg-card p-4 shadow-card">
          <BrandLogo className="w-full" />
        </div>
        <div className="relative">
          <h1 className="text-4xl font-semibold leading-tight">
            Doanh số, KPI và công nợ —<br />
            <span className="text-sidebar-primary">một nơi, rõ ràng.</span>
          </h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/70">Theo dõi mục tiêu, cảnh báo nợ quá hạn và xuất báo cáo cho cả đội.</p>
          <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
            {[
              { i: TrendingUp, t: "Doanh số" },
              { i: Wallet, t: "Công nợ" },
            ].map(({ i: I, t }) => (
              <div key={t} className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3 backdrop-blur">
                <I className="h-5 w-5 text-sidebar-primary" />
                <p className="mt-2 text-sm font-medium">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-sidebar-foreground/50">© 2026 Vietcasa · Nâng niu Ngôi nhà Việt</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <BrandLogo className="mx-auto w-56 lg:hidden" />
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pw">Mật khẩu</Label>
                {mode === "in" && (
                  <button type="button" onClick={() => setMode("forgot")} className="text-xs font-medium text-primary hover:underline">
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="pw"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  onClick={() => setShow(!show)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          {mode !== "forgot" && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={remember} onCheckedChange={(v) => setRem(v === true)} />
              Ghi nhớ đăng nhập
            </label>
          )}
          <Button type="submit" className="w-full bg-brand-gradient shadow-card hover:opacity-90" disabled={busy}>
            {mode === "forgot" && <Mail className="h-4 w-4" />}
            {busy ? "Đang xử lý..." : mode === "in" ? "Đăng nhập" : mode === "up" ? "Đăng ký" : "Gửi link đặt lại"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
          >
            {mode === "in" ? "Chưa có tài khoản? Đăng ký" : "Quay lại đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
