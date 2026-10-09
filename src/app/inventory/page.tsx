"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ItemStatus } from "@/lib/db";
import { STATUSES } from "@/lib/status";
import TagCard from "@/components/TagCard";
import { Chip, PageTitle } from "@/components/ui";

type Filter = "tous" | ItemStatus;

export default function InventoryPage() {
  const [filter, setFilter] = useState<Filter>("tous");
  const [query, setQuery] = useState("");
  const items = useLiveQuery(() =>
    db.items.orderBy("createdAt").reverse().toArray()
  );

  const all = items ?? [];
  const q = query.trim().toLowerCase();
  const filtered = all.filter((i) => {
    if (filter !== "tous" && i.status !== filter) return false;
    if (!q) return true;
    return [i.title, i.brand, i.category, i.sku, i.size]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const count = (s: Filter) =>
    s === "tous" ? all.length : all.filter((i) => i.status === s).length;

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <PageTitle
        right={
          <Link href="/scan" className="text-sm text-chalk-red">
            + Scanner
          </Link>
        }
      >
        Ton stock
      </PageTitle>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher (marque, titre, référence…)"
        className="mt-4 w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-base outline-none focus:border-ink"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Chip active={filter === "tous"} onClick={() => setFilter("tous")}>
          Tous · {count("tous")}
        </Chip>
        {STATUSES.map((s) => (
          <Chip
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
          >
            {s.label} · {count(s.value)}
          </Chip>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {items === undefined && (
          <p className="text-sm text-ink/55">Chargement…</p>
        )}

        {items && filtered.length === 0 && (
          <div className="rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-ink/60">
            {all.length === 0 ? (
              <>
                Aucun article encore.{" "}
                <Link href="/scan" className="text-chalk-red">
                  Scanne le premier
                </Link>
                .
              </>
            ) : (
              "Aucun article ne correspond."
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
