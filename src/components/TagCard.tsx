import Link from "next/link";
import type { Item } from "@/lib/db";

const STATUS_STYLE: Record<Item["status"], { label: string; dot: string }> = {
  en_attente: { label: "En attente", dot: "bg-brass" },
  publie: { label: "Publié", dot: "bg-ink" },
  vendu: { label: "Vendu", dot: "bg-sage" },
};

export default function TagCard({ item }: { item: Item }) {
  const status = STATUS_STYLE[item.status];
  const margin =
    item.soldPrice != null ? item.soldPrice - item.purchasePrice : null;

  return (
    <Link
      href={`/item/${item.id}`}
      className="ticket-notch flex gap-3 items-center border border-line bg-paper-dim/60 px-4 py-3 rounded-sm"
    >
      <div className="relative h-16 w-16 flex-none overflow-hidden rounded-sm border border-line bg-paper">
        {item.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photo}
            alt={item.title || "Article"}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight">
          {item.title || `${item.brand || "Sans marque"} · ${item.category}`}
        </p>
        <p className="mt-0.5 truncate text-sm text-ink/60">
          {item.brand || "Sans marque"} · {item.size || "Taille ?"}
        </p>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          <span className="text-ink/70">{status.label}</span>
        </div>
      </div>

      <div className="flex-none text-right">
        <p className="font-display text-lg font-bold tabular-nums">
          {item.soldPrice != null
            ? `${item.soldPrice} €`
            : `${item.estimateLow}–${item.estimateHigh} €`}
        </p>
        {margin != null && (
          <p
            className={`text-xs font-medium ${
              margin >= 0 ? "text-sage" : "text-chalk-red"
            }`}
          >
            {margin >= 0 ? "+" : ""}
            {margin} €
          </p>
        )}
      </div>
    </Link>
  );
}
