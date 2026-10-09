"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, newId } from "@/lib/db";
import { eur, formatDateFR, inPeriod, PERIODS, todayISO, type Period } from "@/lib/dates";
import { computeBilan, soldDateOf } from "@/lib/finance";
import { DEFAULT_URSSAF_RATE, useSetting } from "@/lib/settings";
import { EXPENSE_CATEGORIES } from "@/lib/status";
import { Chip, Field, NumberInput, PageTitle, SelectInput, Stat, TextInput } from "@/components/ui";

export default function ComptaPage() {
  const [period, setPeriod] = useState<Period>("mois");
  const [adding, setAdding] = useState(false);
  const [rate] = useSetting<number>("urssafRate", DEFAULT_URSSAF_RATE);

  const items = useLiveQuery(() => db.items.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());

  const bilan = computeBilan(items ?? [], expenses ?? [], period, rate);

  const movements = [
    ...(items ?? [])
      .filter((i) => i.status === "vendu" && inPeriod(soldDateOf(i), period))
      .map((i) => ({
        key: `s-${i.id}`,
        date: soldDateOf(i) ?? "",
        label: i.title || `${i.brand} ${i.category}`,
        amount: i.soldPrice ?? 0,
        kind: "vente" as const,
      })),
    ...(expenses ?? [])
      .filter((e) => inPeriod(e.date, period))
      .map((e) => ({
        key: `e-${e.id}`,
        id: e.id,
        date: e.date,
        label: `${e.label || e.category}`,
        amount: -e.amount,
        kind: "depense" as const,
      })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <PageTitle>Compta</PageTitle>

      <div className="mt-4 flex gap-2">
        {PERIODS.map((p) => (
          <Chip key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
            {p.label}
          </Chip>
        ))}
      </div>

      <section className="mt-4 grid grid-cols-2 gap-2.5" aria-label="Bilan">
        <Stat label="Chiffre d'affaires" value={eur(bilan.revenue)} />
        <Stat
          label="Bénéfice net"
          value={eur(bilan.net)}
          tone={bilan.net >= 0 ? "good" : "bad"}
          hint="après achats, frais et dépenses"
        />
        <Stat
          label="Marge brute"
          value={eur(bilan.grossMargin)}
          hint={bilan.marginPct != null ? `${bilan.marginPct.toFixed(0)} % du CA` : undefined}
        />
        <Stat label="Dépenses" value={eur(bilan.expenses)} tone={bilan.expenses > 0 ? "bad" : undefined} />
        <Stat
          label="Valeur du stock"
          value={eur(bilan.stockValue)}
          hint={`${bilan.stockCount} article${bilan.stockCount > 1 ? "s" : ""} au prix d'achat`}
        />
        <Stat
          label="Panier moyen"
          value={bilan.avgBasket != null ? eur(bilan.avgBasket, 2) : "—"}
          hint={`${bilan.soldCount} vente${bilan.soldCount > 1 ? "s" : ""}`}
        />
        <Stat
          label="Rotation"
          value={bilan.avgDaysToSell != null ? `${Math.round(bilan.avgDaysToSell)} j` : "—"}
          hint="délai moyen achat → vente"
        />
        <Stat
          label="Cotisations estimées"
          value={eur(bilan.urssaf)}
          hint={`${rate} % du CA, taux modifiable`}
        />
      </section>

      <p className="mt-3 text-xs text-ink/50">
        Après cotisations estimées : {eur(bilan.netAfterUrssaf)}. Estimation indicative,
        à vérifier avec ton régime réel.
      </p>

      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-bold">Mouvements</h2>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="text-sm text-chalk-red"
          >
            {adding ? "Fermer" : "+ Dépense"}
          </button>
        </div>

        {adding && <ExpenseForm onDone={() => setAdding(false)} />}

        <ul className="mt-3 flex flex-col divide-y divide-line border-y border-line">
          {movements.length === 0 && (
            <li className="py-5 text-center text-sm text-ink/55">
              Aucun mouvement sur cette période.
            </li>
          )}
          {movements.map((m) => (
            <li key={m.key} className="flex items-center gap-3 py-2.5">
              <span className="w-12 flex-none text-xs text-ink/50">
                {m.date ? formatDateFR(m.date) : ""}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{m.label}</span>
              <span
                className={`flex-none font-display text-base font-bold tabular-nums ${
                  m.amount >= 0 ? "text-sage" : "text-chalk-red"
                }`}
              >
                {m.amount >= 0 ? "+" : "−"}
                {eur(Math.abs(m.amount), 2)}
              </span>
              {m.kind === "depense" && "id" in m && (
                <button
                  type="button"
                  aria-label="Supprimer la dépense"
                  onClick={() => confirm("Supprimer cette dépense ?") && db.expenses.delete(m.id)}
                  className="flex-none text-ink/40"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function ExpenseForm({ onDone }: { onDone: () => void }) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState(todayISO());

  async function save() {
    if (!amount || amount <= 0) return;
    await db.expenses.add({
      id: newId(),
      label: label.trim(),
      category,
      amount,
      date,
      createdAt: Date.now(),
    });
    onDone();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-sm border border-line px-4 py-4">
      <Field label="Catégorie">
        <SelectInput value={category} onChange={setCategory} options={EXPENSE_CATEGORIES} />
      </Field>
      <Field label="Détail (facultatif)">
        <TextInput value={label} onCommit={setLabel} placeholder="Ex. Cartons, rouleau d'étiquettes" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Montant">
          <NumberInput value={amount} onCommit={setAmount} placeholder="0" />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={date} onCommit={(v) => v && setDate(v)} />
        </Field>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={!amount || amount <= 0}
        className="rounded-sm bg-chalk-red py-3 font-display text-base font-bold text-paper disabled:opacity-50"
      >
        Ajouter la dépense
      </button>
    </div>
  );
}
