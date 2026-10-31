import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Tổng quan kinh doanh — Vietcasa" },
    { name: "description", content: "Tổng quan báo cáo kinh doanh Vietcasa." },
    { property: "og:title", content: "Tổng quan kinh doanh — Vietcasa" },
    { property: "og:description", content: "Tổng quan báo cáo kinh doanh Vietcasa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard-doanh-so", replace: true });
  },
});
