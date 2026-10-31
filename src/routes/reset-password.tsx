import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/Brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Đặt lại mật khẩu — Vietcasa" },
      { name: "description", content: "Đặt mật khẩu mới cho tài khoản Vietcasa." },
      { property: "og:title", content: "Đặt lại mật khẩu — Vietcasa" },
      { property: "og:description", content: "Đặt mật khẩu mới cho tài khoản Vietcasa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) { toast.error("Hai mật khẩu không khớp"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã đổi mật khẩu");
    navigate({ to: "/dashboard-doanh-so" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-2xl border bg-card p-8 shadow-card">
        <BrandLogo className="mx-auto w-48" />
        <h1 className="text-2xl font-semibold">Đặt lại mật khẩu</h1>
        <div className="space-y-2">
          <Label htmlFor="pw">Mật khẩu mới</Label>
          <Input id="pw" type="password" autoComplete="new-password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw2">Nhập lại mật khẩu</Label>
          <Input id="pw2" type="password" autoComplete="new-password" required minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        <Button type="submit" className="w-full bg-brand-gradient" disabled={busy}>
          {busy ? "Đang lưu..." : "Lưu mật khẩu mới"}
        </Button>
      </form>
    </div>
  );
}
