import { createFileRoute } from "@tanstack/react-router";

// Layout route for the payment window: hosts the checkout (/pay/$id) and the
// per-provider instruction pages (/pay/$id/$provider). No component of its own
// — the matched child renders directly.
export const Route = createFileRoute("/pay/$id")({
  ssr: false,
});
