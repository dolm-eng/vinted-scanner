"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Item } from "@/lib/db";
import TagCard from "@/components/TagCard";

export default function Home() {
  const items = useLiveQuery(() =>
    db.items.orderBy("createdAt").reverse().toArray()
  );

  const stats = useStats(items);

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Griffe
        </h1>
        <span className="text-xs text-ink/55">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
      </header>

      <Link
        href="/scan"
        className="mt-5 flex items-center justify-between rounded-sm bg-chalk-red px-5 py-4 text-paper shadow-sm active:scale-[0.99] transition-transform"
      >
        <span className="font-display text-lg font-bold">
          Scanner un article
        </span>
        <span aria-hidden className="text-2xl leading-none">
          +
        </span>
      </Link>

      <section
        aria-label="Résumé de ton activité"
        className="mt-5 grid grid-cols-2 gap-2.5"
      >
        <StatChip label="En attente" value={stats.enAttente} />
        <StatChip label="Publiés" value={stats.publie} />
        <StatChip label="Vendus (total)" value={stats.vendu} />
        <StatChip
          label="Marge réalisée"
          value={`${stats.margeTotale >= 0 ? "" : "−"}${Math.abs(
            stats.margeTotale
          )} €`}
          accent
        />
      </section>

      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-bold">
            Articles récents
          </h2>
          {items && items.length > 0 && (
            <Link href="/inventory" className="text-sm text-chalk-red">
              Tout voir
            </Link>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2.5">
          {items === undefined && (
            <p className="text-sm text-ink/55">Chargement…</p>
          )}
          {items && items.length === 0 && (
            <div className="rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-ink/60">
              Rien scanné pour l&apos;instant. Ton prochain article de
              brocante commence ici.
            </div>
          )}
          {items?.slice(0, 5).map((item) => (
            <TagCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div className="ticket-notch rounded-sm border border-line bg-paper-dim/60 px-3.5 py-3">
      <p
        className={`font-display text-xl font-bold tabular-nums ${
          accent ? "text-chalk-red" : ""
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-ink/60">{label}</p>
    </div>
  );
}

function useStats(items: Item[] | undefined) {
  const list = items ?? [];
  const enAttente = list.filter((i) => i.status === "en_attente").length;
  const publie = list.filter((i) => i.status === "publie").length;
  const vendus = list.filter((i) => i.status === "vendu");
  const margeTotale = vendus.reduce(
    (sum, i) => sum + ((i.soldPrice ?? 0) - i.purchasePrice),
    0
  );
  return { enAttente, publie, vendu: vendus.length, margeTotale };
}
