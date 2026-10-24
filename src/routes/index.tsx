import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ShieldCheck, Wallet, Activity, KeyRound } from "lucide-react";
import { NeextBrand } from "@/components/neext-brand";
import { Button } from "@/components/ui/button";
import { brandHead } from "@/lib/brand";
import { ProviderLogo, PROVIDER_ORDER } from "@/lib/providers";

export const Route = createFileRoute("/")({
  head: () => brandHead("Payment workspace", "Neext Pay payment workspace for bKash, Nagad, Upay and Rocket personal and merchant accounts."),
  component: Index,
});
function Index() {
  return <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5"><NeextBrand /><Button asChild variant="outline"><Link to="/auth">Sign in <ArrowUpRight /></Link></Button></div></header>
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-10">
        <div><p className="mb-3 text-xs font-bold uppercase text-primary">PAYMENT WORKSPACE</p><h1 className="text-4xl font-extrabold sm:text-5xl">Neext Pay</h1><p className="mt-4 text-muted-foreground">Your payments. One connected workspace.</p></div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm"><ShieldCheck className="h-4 w-4 text-primary" /> Merchant payment gateway</div>
      </div>
      <div className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {[{title:"Dashboard",to:"/admin",icon:Activity},{title:"Merchants",to:"/admin/merchants",icon:Wallet},{title:"Payment links",to:"/admin/links",icon:ArrowUpRight},{title:"API keys",to:"/admin/api-keys",icon:KeyRound}].map(({title,to,icon:Icon})=><Button asChild variant="outline" key={title} className="h-28 justify-between bg-card px-5"><Link to={to as "/admin"}><span className="flex flex-col items-start gap-4"><Icon className="text-primary" /><span className="font-bold">{title}</span></span><ArrowUpRight className="text-muted-foreground" /></Link></Button>)}
      </div>
      <section className="border-t border-border py-8"><h2 className="text-sm font-bold text-muted-foreground">CONNECTED PAYMENT METHODS</h2><div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">{PROVIDER_ORDER.map(provider=><div key={provider} className="flex items-center justify-center border-b border-border bg-card px-4 py-6"><ProviderLogo provider={provider} className="h-10 max-w-full" /></div>)}</div></section>
    </main><footer className="mx-auto flex max-w-6xl justify-between border-t border-border px-5 py-6 text-xs text-muted-foreground"><span>© Neext Pay</span><span>Personal & merchant accounts</span></footer>
  </div>;
}