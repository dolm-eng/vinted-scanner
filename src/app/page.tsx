"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { eur, formatDateFR, todayISO } from "@/lib/dates";
import { computeBilan } from "@/lib/finance";
import { DEFAULT_URSSAF_RATE, useSetting } from "@/lib/settings";
import TagCard from "@/components/TagCard";
import { Stat } from "@/components/ui";

export default function Home() {
  const items = useLiveQuery(() =>
    db.items.orderBy("createdAt").reverse().toArray()
  );
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const [rate] = useSetting<number>("urssafRate", DEFAULT_URSSAF_RATE);
  const [goal] = useSetting<number>("monthlyGoal", 0);

  const bilan = computeBilan(items ?? [], expenses ?? [], "mois", rate);
  const today = todayISO();
  const dueTasks = (tasks ?? [])
    .filter((t) => !t.done && t.dueDate && t.dueDate <= today)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));

  const progress = goal > 0 ? Math.max(0, Math.min(1, bilan.net / goal)) : 0;

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Griffe</h1>
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
        className="mt-5 flex items-center justify-between rounded-sm bg-chalk-red px-5 py-4 text-paper shadow-sm transition-transform active:scale-[0.99]"
      >
        <span className="font-display text-lg font-bold">Scanner un article</span>
        <span aria-hidden className="text-2xl leading-none">+</span>
      </Link>

      <section aria-label="Ce mois-ci" className="mt-5">
        <p className="text-sm font-medium text-ink/70">Ce mois-ci</p>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <Stat label="Chiffre d'affaires" value={eur(bilan.revenue)} />
          <Stat
            label="Bénéfice net"
            value={eur(bilan.net)}
            tone={bilan.net >= 0 ? "good" : "bad"}
          />
          <Stat
            label="En stock"
            value={`${bilan.stockCount}`}
            hint={`${eur(bilan.stockValue)} d'achat`}
          />
          <Stat label="Ventes" value={`${bilan.soldCount}`} />
        </div>

        {goal > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-ink/60">
              <span>Objectif du mois</span>
              <span className="tabular-nums">
                {eur(Math.max(0, bilan.net))} / {eur(goal)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-sage"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        )}
        {goal === 0 && (
          <Link href="/plus" className="mt-3 block text-xs text-chalk-red">
            Fixe un objectif de bénéfice mensuel
          </Link>
        )}
      </section>

      {dueTasks.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold">À faire</h2>
            <Link href="/taches" className="text-sm text-chalk-red">
              Tout voir
            </Link>
          </div>
          <ul className="mt-2 flex flex-col divide-y divide-line border-y border-line">
            {dueTasks.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="truncate">{t.title}</span>
                <span
                  className={`flex-none text-xs ${
                    t.dueDate! < today ? "text-chalk-red" : "text-ink/50"
                  }`}
                >
                  {t.dueDate! < today ? "En retard" : "Aujourd'hui"}
                  {t.dueDate! < today && ` · ${formatDateFR(t.dueDate!)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-bold">Articles récents</h2>
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
              Rien scanné pour l&apos;instant. Ton prochain article de brocante
              commence ici.
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
