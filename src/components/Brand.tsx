import { cn } from "@/lib/utils";

// Absolute path served from public/ so the logo resolves on any host (Vercel included).
export function BrandLogo({ className }: { className?: string }) {
  return <img src="/logo.png" alt="Vietcasa — Nâng niu Ngôi nhà Việt" className={cn("h-auto", className)} />;
}
