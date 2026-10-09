"use client";

import Link from "next/link";
import { db } from "@/lib/db";
import { downloadFile, toCSV } from "@/lib/csv";
import { DEFAULT_URSSAF_RATE, useSetting } from "@/lib/settings";
import { statusMeta } from "@/lib/status";
import { itemNet, soldDateOf } from "@/lib/finance";
import { Field, NumberInput, PageTitle } from "@/components/ui";

export default function PlusPage() {
  const [rate, setRate] = useSetting<number>("urssafRate", DEFAULT_URSSAF_RATE);
  const [goal, setGoal] = useSetting<number>("monthlyGoal", 0);

  async function exportStock() {
    const items = await db.items.orderBy("createdAt").toArray();
    const rows = [
      [
        "Référence", "Titre", "Marque", "Catégorie", "Taille", "État", "Statut",
        "Plateforme", "Date d'achat", "Prix d'achat", "Prix mis en vente",
        "Prix de vente", "Date de vente", "Frais", "Bénéfice",
      ],
      ...items.map((i) => [
        i.sku, i.title, i.brand, i.category, i.size, i.condition,
        statusMeta(i.status).label, i.platform, i.purchaseDate, i.purchasePrice,
        i.listedPrice, i.soldPrice, soldDateOf(i), i.fees, itemNet(i),
      ]),
    ];
    downloadFile("griffe-stock.csv", toCSV(rows));
  }

  async function exportCompta() {
    const [items, expenses] = await Promise.all([db.items.toArray(), db.expenses.toArray()]);
    const rows: (string | number | null)[][] = [
      ["Date", "Type", "Libellé", "Montant"],
      ...items
        .filter((i) => i.status === "vendu")
        .map((i) => [soldDateOf(i), "Vente", i.title || `${i.brand} ${i.category}`, i.soldPrice ?? 0]),
      ...items
        .filter((i) => i.status === "vendu")
        .map((i) => [soldDateOf(i), "Achat du stock vendu", i.title || `${i.brand} ${i.category}`, -i.purchasePrice]),
      ...items
        .filter((i) => i.status === "vendu" && i.fees > 0)
        .map((i) => [soldDateOf(i), "Frais de vente", i.title || `${i.brand} ${i.category}`, -i.fees]),
      ...expenses.map((e) => [e.date, `Dépense · ${e.category}`, e.label, -e.amount]),
    ];
    rows.splice(1, rows.length - 1, ...rows.slice(1).sort((a, b) => String(a[0]) < String(b[0]) ? 1 : -1));
    downloadFile("griffe-compta.csv", toCSV(rows));
  }

  async function wipe() {
    if (!confirm("Supprimer TOUTES tes données (stock, dépenses, tâches) de ce téléphone ? Cette action est définitive.")) return;
    await Promise.all([db.items.clear(), db.expenses.clear(), db.tasks.clear(), db.settings.clear()]);
    alert("Toutes les données ont été supprimées.");
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <PageTitle>Plus</PageTitle>

      <nav className="mt-4 flex flex-col divide-y divide-line border-y border-line" aria-label="Outils">
        <Link href="/taches" className="flex items-center justify-between py-3.5">
          <span>
            <span className="block font-semibold">Tâches</span>
            <span className="text-sm text-ink/55">À faire, échéances, priorités</span>
          </span>
          <span aria-hidden className="text-ink/40">›</span>
        </Link>
        <Link href="/niches" className="flex items-center justify-between py-3.5">
          <span>
            <span className="block font-semibold">Niches à chercher</span>
            <span className="text-sm text-ink/55">Idées de sourcing avec multiplicateur</span>
          </span>
          <span aria-hidden className="text-ink/40">›</span>
        </Link>
      </nav>

      <section className="mt-7 flex flex-col gap-3.5">
        <h2 className="font-display text-base font-bold">Réglages</h2>
        <Field label="Objectif de bénéfice mensuel">
          <NumberInput value={goal || null} onCommit={(v) => setGoal(v ?? 0)} placeholder="Ex. 300" />
        </Field>
        <Field label="Taux de cotisations estimé (% du CA)">
          <NumberInput
            value={rate}
            suffix="%"
            onCommit={(v) => setRate(v ?? DEFAULT_URSSAF_RATE)}
          />
        </Field>
        <p className="text-xs text-ink/50">
          Le taux par défaut ({DEFAULT_URSSAF_RATE} %) correspond à la vente de marchandises en
          micro-entreprise. Vérifie le taux de ton régime : il sert uniquement à l&apos;estimation
          affichée dans la compta.
        </p>
      </section>

      <section className="mt-7 flex flex-col gap-2.5">
        <h2 className="font-display text-base font-bold">Données</h2>
        <p className="text-xs text-ink/50">
          Tout est stocké sur ce téléphone, rien n&apos;est envoyé en ligne. Pense à exporter
          régulièrement : si tu effaces les données du navigateur, elles disparaissent.
        </p>
        <button type="button" onClick={exportStock} className="rounded-sm border border-ink py-3 text-sm font-medium">
          Exporter le stock (CSV)
        </button>
        <button type="button" onClick={exportCompta} className="rounded-sm border border-ink py-3 text-sm font-medium">
          Exporter la compta (CSV)
        </button>
        <button type="button" onClick={wipe} className="rounded-sm border border-chalk-red py-3 text-sm font-medium text-chalk-red">
          Supprimer toutes mes données
        </button>
      </section>
    </main>
  );
}
