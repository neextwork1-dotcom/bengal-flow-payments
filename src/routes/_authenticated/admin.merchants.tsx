import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMerchants, saveMerchant } from "@/lib/serverfns/admin";

export const Route = createFileRoute("/_authenticated/admin/merchants")({
  head: () => brandHead("Merchants", "Manage merchants in the Neext Pay payment gateway."),
  component: Merchants,
});

function Merchants() {
  const list = useServerFn(listMerchants);
  const save = useServerFn(saveMerchant);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["merchants"], queryFn: () => list() });
  const [form, setForm] = useState({ name: "", provider: "nagad", accountNumber: "" });
  const [err, setErr] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await save({ data: form });
      setForm({ name: "", provider: "nagad", accountNumber: "" });
      qc.invalidateQueries({ queryKey: ["merchants"] });
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  async function toggle(m: any) {
    await save({ data: { id: m.id, name: m.name, provider: m.provider, accountNumber: m.account_number, isActive: !m.is_active } });
    qc.invalidateQueries({ queryKey: ["merchants"] });
  }

  const input = "rounded-lg border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Merchants</h1>
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-4">
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className={input}>
          {["nagad", "bkash", "upay", "rocket"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <input required placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className={input} />
        <Button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Add</Button>
        {err && <p className="w-full text-sm text-destructive">{err}</p>}
      </form>
      <div className="rounded-lg border border-border bg-card">
        {(data ?? []).map((m: any) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4 last:border-0">
            <div>
              <p className="font-semibold">{m.name} <span className="text-xs uppercase text-muted-foreground">{m.provider}</span></p>
              <p className="text-sm text-muted-foreground">{m.account_number} · ID {m.id}</p>
              <p className="font-mono text-xs text-muted-foreground">Callback secret: {m.callback_secret}</p>
            </div>
            <Button onClick={() => toggle(m)} className="text-sm text-primary">{m.is_active ? "Deactivate" : "Activate"}</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
