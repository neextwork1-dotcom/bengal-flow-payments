import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { NeextBrand } from "@/components/neext-brand";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Neext Pay Admin" },
      {
        name: "description", content: "Sign in to the Neext Pay payment gateway admin panel.",
      },
      { property: "og:title", content: "Sign in — Neext Pay Admin" },
      {
        property: "og:description",
        content: "Sign in to the Neext Pay payment gateway admin panel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("admin@topsoftbd.com"); // default admin account
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        navigate({ to: "/admin" });
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        if (data.session) {
          navigate({ to: "/admin" });
        } else {
          setNotice(
            "Check your email to confirm the account. After confirming, sign in here. The first account created becomes an admin.",
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-nagad-soft px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <NeextBrand />
          <h1 className="text-xl font-bold text-foreground">Neext Pay Admin</h1>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-card-lg">
          <div className="mb-5 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
            <Button
              type="button"
              onClick={() => setMode("signin")}
              className={
                mode === "signin"
                  ? "rounded-lg bg-card px-3 py-2 text-foreground shadow-card"
                  : "rounded-lg px-3 py-2 text-muted-foreground"
              }
            >
              Sign in
            </Button>
            <Button
              type="button"
              onClick={() => setMode("signup")}
              className={
                mode === "signup"
                  ? "rounded-lg bg-card px-3 py-2 text-foreground shadow-card"
                  : "rounded-lg px-3 py-2 text-muted-foreground"
              }
            >
              Create account
            </Button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
                {notice}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
