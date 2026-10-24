export const PAYMENT_INTRO_MS = 5000;
export function brandHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Neext Pay` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Neext Pay` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] };
}