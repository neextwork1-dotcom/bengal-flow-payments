import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTransactions, updatePaymentStatus } from "@/lib/serverfns/admin";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  head: () => brandHead("Transactions", "Manage transactions in the Neext Pay payment gateway."),
  component: Transactions,
});

function Transactions() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const list = useServerFn(listTransactions);
  const update = useServerFn(updatePaymentStatus);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["tx", status, search],
    queryFn: () => list({ data: { status, search } }),
  });

  async function setTo(id: string, s: "pending" | "complete" | "failed") {
    const trxId = s === "complete" ? (prompt("TRX ID (optional)") ?? undefined) : undefined;
    await update({ data: { id, status: s, ...(trxId ? { trxId } : {}) } });
    qc.invalidateQueries({ queryKey: ["tx"] });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <div className="flex gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          {["all", "pending", "complete", "failed"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Order, TRX, phone" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="p-3">Order</th><th className="p-3">Merchant</th><th className="p-3">Amount</th><th className="p-3">TRX</th><th className="p-3">Status</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {(data ?? []).map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3">{r.order_id ?? r.id.slice(0, 8)}</td>
                <td className="p-3">{r.merchants?.name} <span className="uppercase text-muted-foreground">{r.merchants?.provider}</span></td>
                <td className="p-3">৳{r.amount}</td>
                <td className="p-3 font-mono">{r.trx_id ?? "—"}</td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="space-x-2 p-3 whitespace-nowrap">
                  {r.status !== "complete" && <Button onClick={() => setTo(r.id, "complete")} className="text-primary">Complete</Button>}
                  {r.status !== "failed" && <Button onClick={() => setTo(r.id, "failed")} className="text-destructive">Fail</Button>}
                  {r.status !== "pending" && <Button onClick={() => setTo(r.id, "pending")} className="text-muted-foreground">Reset</Button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
