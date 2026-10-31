import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vietcasa — Báo cáo Doanh số & Công nợ" },
      { name: "description", content: "Theo dõi doanh số, KPI và công nợ của đội kinh doanh." },
      { property: "og:title", content: "Vietcasa — Báo cáo Doanh số & Công nợ" },
      { property: "og:description", content: "Theo dõi doanh số, KPI và công nợ của đội kinh doanh." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard-doanh-so" : "/auth" });
  },
  component: () => null,
});
