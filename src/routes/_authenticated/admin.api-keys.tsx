import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createApiKey, deleteApiKey, listApiKeys, listGateway, toggleApiKey } from "@/lib/serverfns/admin";

export const Route = createFileRoute("/_authenticated/admin/api-keys")({
  head: () => brandHead("API keys", "Manage api keys in the Neext Pay payment gateway."),
  component: ApiKeys,
});

function ApiKeys() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const toggle = useServerFn(toggleApiKey);
  const remove = useServerFn(deleteApiKey);
  const gateway = useServerFn(listGateway);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["keys"], queryFn: () => list() });
  const { data: gw } = useQuery({ queryKey: ["gateway"], queryFn: () => gateway() });
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["keys"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await create({ data: { label } });
    setFresh(r.key);
    setLabel("");
    refresh();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API keys</h1>
      <form onSubmit={add} className="flex gap-2">
        <input placeholder="Label (e.g. Android phone 1)" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <Button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Create key</Button>
      </form>
      {fresh && (
        <div className="rounded-lg border border-primary bg-card p-4">
          <p className="text-sm text-muted-foreground">Copy this key now — it won't be shown again.</p>
          <p className="break-all font-mono">{fresh}</p>
        </div>
      )}
      <div className="rounded-lg border border-border bg-card">
        {(data ?? []).map((k: any) => (
          <div key={k.id} className="flex items-center justify-between border-b border-border p-4 last:border-0">
            <div>
              <p className="font-semibold">{k.label}</p>
              <p className="font-mono text-xs text-muted-foreground">{k.key_prefix}… · last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</p>
            </div>
            <div className="space-x-3 text-sm">
              <Button onClick={async () => { await toggle({ data: { id: k.id, isActive: !k.is_active } }); refresh(); }} className="text-primary">{k.is_active ? "Disable" : "Enable"}</Button>
              <Button onClick={async () => { await remove({ data: { id: k.id } }); refresh(); }} className="text-destructive">Delete</Button>
            </div>
          </div>
        ))}
      </div>
      <h2 className="text-lg font-semibold">Connected phones</h2>
      <div className="rounded-lg border border-border bg-card">
        {(gw?.devices ?? []).map((d: any) => (
          <div key={d.id} className="border-b border-border p-4 text-sm last:border-0">
            {d.name ?? d.device_id ?? d.id} · last seen {d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : "—"}
          </div>
        ))}
        {gw && gw.devices.length === 0 && <p className="p-4 text-sm text-muted-foreground">No phones connected yet.</p>}
      </div>
    </div>
  );
}
