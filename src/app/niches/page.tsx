"use client";

import { useState } from "react";
import { NICHES, nicheStats, type Gender, type Season } from "@/lib/niches";
import { eur } from "@/lib/dates";
import { Chip, PageTitle } from "@/components/ui";

type GenderFilter = "tous" | Gender;
type SeasonFilter = "toutes" | Season;
type Sort = "profit" | "multiplier" | "buy";

const GENDERS: { value: GenderFilter; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "H", label: "Homme" },
  { value: "F", label: "Femme" },
  { value: "U", label: "Mixte" },
];

const SEASONS: SeasonFilter[] = ["toutes", "Hiver", "Mi-saison", "Été", "Toute l'année"];

export default function NichesPage() {
  const [gender, setGender] = useState<GenderFilter>("tous");
  const [season, setSeason] = useState<SeasonFilter>("toutes");
  const [sort, setSort] = useState<Sort>("profit");

  const list = NICHES.filter(
    (n) =>
      (gender === "tous" || n.gender === gender || n.gender === "U") &&
      (season === "toutes" || n.season === season)
  )
    .map((n) => ({ n, s: nicheStats(n) }))
    .sort((a, b) =>
      sort === "profit"
        ? b.s.profit - a.s.profit
        : sort === "multiplier"
          ? b.s.multiplier - a.s.multiplier
          : a.s.buyMid - b.s.buyMid
    );

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <PageTitle>Niches à chercher</PageTitle>
      <p className="mt-2 rounded-sm border border-brass/50 bg-brass/10 px-3 py-2 text-xs text-ink/75">
        Ordres de grandeur indicatifs, pas des prix constatés. Vérifie toujours les
        annonces réelles sur Vinted avant d&apos;acheter.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {GENDERS.map((g) => (
          <Chip key={g.value} active={gender === g.value} onClick={() => setGender(g.value)}>
            {g.label}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {SEASONS.map((s) => (
          <Chip key={s} small active={season === s} onClick={() => setSeason(s)}>
            {s === "toutes" ? "Toutes saisons" : s}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-ink/60">
        Trier par
        <Chip small active={sort === "profit"} onClick={() => setSort("profit")}>
          Gain
        </Chip>
        <Chip small active={sort === "multiplier"} onClick={() => setSort("multiplier")}>
          Multiplicateur
        </Chip>
        <Chip small active={sort === "buy"} onClick={() => setSort("buy")}>
          Prix d&apos;achat
        </Chip>
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {list.map(({ n, s }) => (
          <li
            key={n.name}
            className="ticket-notch rounded-sm border border-line bg-paper-dim/60 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold leading-tight">{n.name}</p>
                <p className="mt-0.5 text-xs text-ink/55">
                  {n.hint} · {n.season}
                </p>
              </div>
              <span className="flex-none rounded-full bg-ink px-2 py-0.5 text-xs font-medium text-paper">
                x{s.multiplier.toFixed(1)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-[11px] text-ink/50">Achat</p>
                <p className="font-display font-bold tabular-nums">
                  {n.buy[0]}–{n.buy[1]} €
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink/50">Revente</p>
                <p className="font-display font-bold tabular-nums">
                  {n.resell[0]}–{n.resell[1]} €
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink/50">Gain moyen</p>
                <p className="font-display font-bold tabular-nums text-sage">
                  +{eur(s.profit)}
                </p>
              </div>
            </div>
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-ink/60">
            Aucune niche pour ces filtres.
          </li>
        )}
      </ul>
    </main>
  );
}
