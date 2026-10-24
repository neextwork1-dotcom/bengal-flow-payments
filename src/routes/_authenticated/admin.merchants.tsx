import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMerchants, saveMerchant, saveMerchantAccount } from "@/lib/serverfns/admin";
import type { Database } from "@/integrations/supabase/types";

type MerchantAccount = Database["public"]["Tables"]["merchant_accounts"]["Row"];
type Merchant = Database["public"]["Tables"]["merchants"]["Row"] & { merchant_accounts: MerchantAccount[] };

export const Route = createFileRoute("/_authenticated/admin/merchants")({
  head: () => brandHead("Merchants", "Manage merchants in the Neext Pay payment gateway."),
  component: Merchants,
});

function Merchants() {
  const list = useServerFn(listMerchants);
  const save = useServerFn(saveMerchant);
  const saveAccount = useServerFn(saveMerchantAccount);
  const qc = useQueryClient();
  const { data } = useQuery<Merchant[]>({ queryKey: ["merchants"], queryFn: () => list() });
  const [form, setForm] = useState({ name: "", provider: "nagad", accountNumber: "" });
  const [err, setErr] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const merchant = await save({ data: { name: form.name } });
      await saveAccount({ data: { merchantId: merchant.id, provider: form.provider, accountNumber: form.accountNumber, accountType: "merchant" } });
      setForm({ name: "", provider: "nagad", accountNumber: "" });
      qc.invalidateQueries({ queryKey: ["merchants"] });
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  async function toggle(m: Merchant) {
    setErr("");
    try {
      await save({ data: { id: m.id, name: m.name, logoUrl: m.logo_url ?? "", isActive: !m.is_active } });
      await qc.invalidateQueries({ queryKey: ["merchants"] });
    } catch (x) {
      setErr((x as Error).message);
    }
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
        {(data ?? []).map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4 last:border-0">
            <div>
              <p className="font-semibold">{m.name}</p>
              {m.merchant_accounts.map((account) => (
                <p key={account.id} className="text-sm text-muted-foreground"><span className="uppercase">{account.provider}</span> · {account.account_number} · {account.account_type}</p>
              ))}
              <p className="text-sm text-muted-foreground">ID {m.id}</p>
              <p className="font-mono text-xs text-muted-foreground">Callback secret: {m.callback_secret}</p>
            </div>
            <Button onClick={() => toggle(m)} className="text-sm text-primary">{m.is_active ? "Deactivate" : "Activate"}</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
