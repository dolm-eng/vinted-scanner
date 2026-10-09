import Link from "next/link";
import type { Item } from "@/lib/db";
import { itemNet } from "@/lib/finance";
import { statusMeta } from "@/lib/status";

export default function TagCard({ item }: { item: Item }) {
  const status = statusMeta(item.status);
  const net = itemNet(item);
  const cover = item.photos[0];

  return (
    <Link
      href={`/item/${item.id}`}
      className="ticket-notch flex items-center gap-3 rounded-sm border border-line bg-paper-dim/60 px-4 py-3"
    >
      <div className="relative h-16 w-16 flex-none overflow-hidden rounded-sm border border-line bg-paper">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={item.title || "Article"}
            className="h-full w-full object-cover"
          />
        ) : null}
        {item.photos.length > 1 && (
          <span className="absolute bottom-0.5 right-0.5 rounded-sm bg-ink/75 px-1 text-[10px] text-paper">
            {item.photos.length}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-tight">
          {item.title || `${item.brand || "Sans marque"} · ${item.category}`}
        </p>
        <p className="mt-0.5 truncate text-sm text-ink/60">
          {item.brand || "Sans marque"} · {item.size || "Taille ?"}
          {item.sku ? ` · ${item.sku}` : ""}
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
            : item.listedPrice != null
              ? `${item.listedPrice} €`
              : `${item.estimateLow}–${item.estimateHigh} €`}
        </p>
        {net != null && (
          <p
            className={`text-xs font-medium ${
              net >= 0 ? "text-sage" : "text-chalk-red"
            }`}
          >
            {net >= 0 ? "+" : ""}
            {Math.round(net * 100) / 100} €
          </p>
        )}
      </div>
    </Link>
  );
}
