import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "NagadPay — Auto Payment Gateway",
        description:
          "Automatic Nagad payment verification: send customers to a hosted payment window, verify their TRX ID against collected merchant SMS, and get an instant callback on your server.",
      },
      {
        property: "og:title",
        content: "NagadPay — Auto Payment Gateway",
      },
      {
        property: "og:description",
        content:
          "Hosted Nagad payment window with automatic TRX ID verification and REST callback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-nagad-soft">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-nagad text-base font-bold text-primary-foreground shadow-card">
            N
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">NagadPay</span>
        </div>
        <Link
          to="/auth"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90"
        >
          Admin panel
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
        <div className="rounded-3xl bg-card p-10 shadow-card-lg">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Auto payment gateway
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
            Collect Nagad payments and verify them automatically
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Send customers to a hosted payment window that shows your merchant number and
            amount. They pay through the Nagad app, paste their TRX ID, and the server
            checks it against the transactions collected from your merchant phone — then
            calls your callback URL and redirects the customer.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Create a payment",
                body: "Your server calls the create-payment API with the amount, redirect URL and callback URL.",
              },
              {
                step: "2",
                title: "Customer pays",
                body: "They open the payment window, copy the merchant number, pay in the Nagad app and submit the TRX ID.",
              },
              {
                step: "3",
                title: "Auto verify",
                body: "The TRX ID is matched against collected SMS data — exact ID, amount and merchant — and your server is called back.",
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-border bg-muted/40 p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {s.step}
                </div>
                <h3 className="mt-3 font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
