import { NeextBrand } from "@/components/neext-brand";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", match: "exact" },
  { to: "/admin/transactions", label: "Transactions", match: "prefix" },
  { to: "/admin/merchants", label: "Merchants", match: "exact" },
  { to: "/admin/links", label: "Payment links", match: "exact" },
  { to: "/admin/api-keys", label: "API keys", match: "exact" },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-5 py-6">
          <NeextBrand />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active =
              item.match === "exact"
                ? pathname === item.to
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  active
                    ? "block rounded-lg bg-sidebar-accent px-3 py-2.5 text-sm font-semibold text-sidebar-foreground"
                    : "block rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <Button
            type="button"
            onClick={signOut}
            className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <NeextBrand />
          </div>
          <Button
            type="button"
            onClick={signOut}
            className="text-sm text-muted-foreground"
          >
            Sign out
          </Button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 md:hidden">
          {NAV.map((item) => {
            const active =
              item.match === "exact"
                ? pathname === item.to
                : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  active
                    ? "whitespace-nowrap rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground"
                    : "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-muted-foreground"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
