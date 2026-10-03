"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ItemStatus } from "@/lib/db";
import { CONDITIONS, type Condition } from "@/lib/priceGuide";

const STATUS_FLOW: { value: ItemStatus; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "publie", label: "Publié" },
  { value: "vendu", label: "Vendu" },
];

export default function ItemDetail({ id }: { id: string }) {
  const router = useRouter();
  const item = useLiveQuery(() => db.items.get(id), [id]);

  const [listedPrice, setListedPrice] = useState("");
  const [soldPrice, setSoldPrice] = useState("");

  useEffect(() => {
    if (item) {
      setListedPrice(item.listedPrice != null ? String(item.listedPrice) : "");
      setSoldPrice(item.soldPrice != null ? String(item.soldPrice) : "");
    }
  }, [item?.id]);

  if (item === undefined) {
    return (
      <main className="mx-auto max-w-md px-4 pt-6">
        <p className="text-sm text-ink/55">Chargement…</p>
      </main>
    );
  }

  if (item === null) {
    return (
      <main className="mx-auto max-w-md px-4 pt-6">
        <p className="text-sm text-ink/60">Cet article n&apos;existe plus.</p>
      </main>
    );
  }

  async function setStatus(status: ItemStatus) {
    await db.items.update(id, { status, updatedAt: Date.now() });
  }

  async function saveListedPrice() {
    await db.items.update(id, {
      listedPrice: listedPrice ? Number(listedPrice) : null,
      updatedAt: Date.now(),
    });
  }

  async function saveSoldPrice() {
    if (!item) return;
    await db.items.update(id, {
      soldPrice: soldPrice ? Number(soldPrice) : null,
      status: soldPrice ? "vendu" : item.status,
      updatedAt: Date.now(),
    });
  }

  async function setCondition(condition: Condition) {
    await db.items.update(id, { condition, updatedAt: Date.now() });
  }

  async function remove() {
    if (!confirm("Supprimer cet article du stock ?")) return;
    await db.items.delete(id);
    router.push("/inventory");
  }

  const margin =
    item.soldPrice != null ? item.soldPrice - item.purchasePrice : null;

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-ink/60"
      >
        ← Retour
      </button>

      <div className="mt-3 flex gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.photo}
          alt={item.title}
          className="h-28 w-28 flex-none rounded-sm border border-line object-cover"
        />
        <div>
          <h1 className="font-display text-lg font-bold leading-tight">
            {item.title || item.category}
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            {item.brand || "Sans marque"} · {item.size || "Taille ?"} ·{" "}
            {item.category}
          </p>
          <p className="mt-1 text-xs text-ink/50">
            Acheté {item.purchasePrice} €
          </p>
        </div>
      </div>

      <section className="mt-5">
        <p className="text-sm font-medium text-ink/70">Statut</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {STATUS_FLOW.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              className={`rounded-sm border px-2 py-2 text-sm ${
                item.status === s.value
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink/70"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <p className="text-sm font-medium text-ink/70">État</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              className={`rounded-sm border px-3 py-2 text-sm ${
                item.condition === c.value
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink/70"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <div className="ticket-notch mt-5 rounded-sm border border-line bg-paper-dim/60 px-4 py-4">
        <p className="text-xs text-ink/60">Estimation Vinted</p>
        <p className="font-display text-2xl font-bold tabular-nums">
          {item.estimateLow}–{item.estimateHigh} €
        </p>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink/70">
            Prix mis en vente
          </label>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-sm border border-line bg-paper px-3">
              <input
                value={listedPrice}
                onChange={(e) => setListedPrice(e.target.value)}
                onBlur={saveListedPrice}
                inputMode="decimal"
                placeholder="—"
                className="w-full bg-transparent py-2.5 text-base outline-none"
              />
              <span className="text-ink/50">€</span>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink/70">
            Prix de vente
          </label>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-sm border border-line bg-paper px-3">
              <input
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                onBlur={saveSoldPrice}
                inputMode="decimal"
                placeholder="—"
                className="w-full bg-transparent py-2.5 text-base outline-none"
              />
              <span className="text-ink/50">€</span>
            </div>
          </div>
        </div>
      </section>

      {margin != null && (
        <p
          className={`mt-3 text-sm font-medium ${
            margin >= 0 ? "text-sage" : "text-chalk-red"
          }`}
        >
          Marge : {margin >= 0 ? "+" : ""}
          {margin} €
        </p>
      )}

      <button
        type="button"
        onClick={remove}
        className="mt-8 w-full rounded-sm border border-chalk-red py-3 text-sm font-medium text-chalk-red"
      >
        Supprimer cet article
      </button>
    </main>
  );
}
