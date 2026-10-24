import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createPaymentLink, listMerchants } from "@/lib/serverfns/admin";

export const Route = createFileRoute("/_authenticated/admin/links")({
  head: () => ({ meta: [{ title: "Payment links — NagadPay Admin" }] }),
  component: Links,
});

function Links() {
  const list = useServerFn(listMerchants);
  const create = useServerFn(createPaymentLink);
  const { data: merchants } = useQuery({ queryKey: ["merchants"], queryFn: () => list() });
  const [form, setForm] = useState({ merchantId: "", amount: "", orderId: "", redirectUrl: "", callbackUrl: "" });
  const [link, setLink] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const r = await create({ data: { ...form, amount: Number(form.amount) } });
      setLink(`${window.location.origin}/pay/${r.id}`);
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  const input = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Create payment link</h1>
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
        <select required value={form.merchantId} onChange={(e) => setForm({ ...form, merchantId: e.target.value })} className={input}>
          <option value="">Select merchant</option>
          {(merchants ?? []).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input required type="number" min="1" step="0.01" placeholder="Amount (৳)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={input} />
        <input placeholder="Order ID" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className={input} />
        <input placeholder="Redirect URL" value={form.redirectUrl} onChange={(e) => setForm({ ...form, redirectUrl: e.target.value })} className={input} />
        <input placeholder="Callback URL" value={form.callbackUrl} onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })} className={input} />
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create link</button>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </form>
      {link && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Payment link</p>
          <a href={link} className="break-all font-mono text-primary">{link}</a>
        </div>
      )}
    </div>
  );
}
