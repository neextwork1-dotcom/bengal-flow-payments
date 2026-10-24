import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { NeextBrand } from "@/components/neext-brand";
import { PAYMENT_INTRO_MS } from "@/lib/brand";

export function BrandIntro() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pending = useRouterState({ select: (s) => s.status === "pending" });
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const payment = pathname.match(/^\/pay\/([^/]+)/)?.[1];
    const key = payment ? `neext-intro:${payment}` : "neext-intro:home";
    if ((payment || pathname === "/") && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "seen");
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), PAYMENT_INTRO_MS);
      return () => clearTimeout(timer);
    }
    setVisible(false);
    return undefined;
  }, [pathname]);
  if (!visible && !pending) return null;
  return <div className="brand-intro" role="status" aria-label="Neext Pay loading">
    <div className="intro-mark flex flex-col items-center gap-8">
      <NeextBrand />
      <div className="w-40 overflow-hidden bg-brand-surface/10"><div className="intro-progress" /></div>
    </div>
  </div>;
}