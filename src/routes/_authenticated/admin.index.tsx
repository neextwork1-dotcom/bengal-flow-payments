import { brandHead } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/serverfns/admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => brandHead("Dashboard", "Manage dashboard in the Neext Pay payment gateway."),
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  if (isLoading || !data) return <p className="text-muted-foreground">Loading…</p>;
  const stats = [
    { label: "Total payments", value: data.totalPayments },
    { label: "Completed", value: data.completedCount },
    { label: "Pending", value: data.pendingCount },
    { label: "Collected (৳)", value: data.completedTotal.toLocaleString() },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card">
        <h2 className="border-b border-border p-4 font-semibold">Recent payments</h2>
        <table className="w-full text-sm">
          <tbody>
            {data.recent.map((r: any) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3">{r.order_id ?? r.id.slice(0, 8)}</td>
                <td className="p-3">৳{r.amount}</td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
