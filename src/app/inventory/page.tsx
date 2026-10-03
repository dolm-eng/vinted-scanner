"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import TagCard from "@/components/TagCard";

const FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "en_attente", label: "En attente" },
  { value: "publie", label: "Publiés" },
  { value: "vendu", label: "Vendus" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

export default function InventoryPage() {
  const [filter, setFilter] = useState<Filter>("tous");
  const items = useLiveQuery(() =>
    db.items.orderBy("createdAt").reverse().toArray()
  );

  const filtered = (items ?? []).filter((i) =>
    filter === "tous" ? true : i.status === filter
  );

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <h1 className="font-display text-xl font-bold">Ton stock</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`flex-none rounded-full border px-3.5 py-1.5 text-sm ${
              filter === f.value
                ? "border-ink bg-ink text-paper"
                : "border-line text-ink/70"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {items === undefined && (
          <p className="text-sm text-ink/55">Chargement…</p>
        )}

        {items && filtered.length === 0 && (
          <div className="rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-ink/60">
            {items.length === 0 ? (
              <>
                Aucun article encore.{" "}
                <Link href="/scan" className="text-chalk-red">
                  Scanne le premier
                </Link>
                .
              </>
            ) : (
              "Rien dans cette catégorie."
            )}
          </div>
        )}

        {filtered.map((item) => (
          <TagCard key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
}
