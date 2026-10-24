import symbol from "@/assets/neext-symbol.png";

export function NeextBrand({ compact = false }: { compact?: boolean }) {
  return <span className="inline-flex items-center gap-2.5">
    <img src={symbol} alt="" width={1024} height={1024} className="h-10 w-10 object-contain" />
    {!compact && <span className="text-xl font-extrabold">Neext <span className="text-primary">Pay</span></span>}
  </span>;
}