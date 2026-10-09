"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Condition, type Item, type ItemStatus } from "@/lib/db";
import { eur, daysBetween, todayISO } from "@/lib/dates";
import { itemNet } from "@/lib/finance";
import { generateDescription, generateTitle, suggestedPrice } from "@/lib/listing";
import { downscale, readFileAsDataURL } from "@/lib/photo";
import { CATEGORIES, CONDITIONS } from "@/lib/priceGuide";
import { PLATFORMS, STATUSES } from "@/lib/status";
import PhotoStudio from "./PhotoStudio";
import { Chip, Field, NumberInput, SelectInput, TextInput } from "./ui";

export default function ItemDetail({ id }: { id: string }) {
  const router = useRouter();
  // `null` = introuvable (chargé mais absent), `undefined` = encore en chargement.
  const item = useLiveQuery(
    () => db.items.get(id).then((i) => i ?? null),
    [id]
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [studioIndex, setStudioIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState<"title" | "desc" | null>(null);

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

  const current: Item = item;

  async function update(patch: Partial<Item>) {
    await db.items.update(id, { ...patch, updatedAt: Date.now() });
  }

  async function setStatus(status: ItemStatus) {
    const patch: Partial<Item> = { status };
    if (status === "vendu" && !current.soldDate) patch.soldDate = todayISO();
    if (status !== "vendu") patch.soldDate = null;
    await update(patch);
  }

  async function setSoldPrice(price: number | null) {
    if (price == null) {
      await update({
        soldPrice: null,
        soldDate: null,
        status: current.status === "vendu" ? "publie" : current.status,
      });
    } else {
      await update({
        soldPrice: price,
        status: "vendu",
        soldDate: current.soldDate ?? todayISO(),
      });
    }
  }

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const urls = await Promise.all(
      files.map(async (f) => downscale(await readFileAsDataURL(f)))
    );
    await update({ photos: [...current.photos, ...urls] });
  }

  async function copy(kind: "title" | "desc", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Presse-papiers indisponible : l'utilisateur peut sélectionner le texte à la main.
    }
  }

  async function remove() {
    if (!confirm("Supprimer cet article du stock ?")) return;
    await db.items.delete(id);
    router.push("/inventory");
  }

  const net = itemNet(current);
  const marginPct =
    current.soldPrice && net != null ? (net / current.soldPrice) * 100 : null;
  const daysToSell =
    current.soldDate && current.purchaseDate
      ? daysBetween(current.purchaseDate, current.soldDate)
      : null;

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-ink/60"
      >
        ← Retour
      </button>

      {/* Photos */}
      <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2">
        {current.photos.map((p, i) => (
          <div key={i} className="relative h-56 w-44 flex-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p}
              alt={`Photo ${i + 1}`}
              className="h-full w-full rounded-sm border border-line object-cover"
            />
            <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1.5">
              <button
                type="button"
                onClick={() => setStudioIndex(i)}
                className="flex-1 rounded-sm bg-ink/80 py-1.5 text-xs font-medium text-paper"
              >
                Studio
              </button>
              {current.photos.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Supprimer cette photo ?")) {
                      update({ photos: current.photos.filter((_, idx) => idx !== i) });
                    }
                  }}
                  aria-label={`Supprimer la photo ${i + 1}`}
                  className="rounded-sm bg-ink/80 px-2.5 py-1.5 text-xs text-paper"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-56 w-28 flex-none flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-line text-ink/50"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="text-xs">Photo</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={addPhotos}
          className="hidden"
        />
      </div>

      {/* Statut */}
      <section className="mt-4">
        <p className="text-sm font-medium text-ink/70">Statut</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              className={`rounded-sm border px-1 py-2 text-xs ${
                current.status === s.value
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-ink/70"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Annonce */}
      <section className="mt-6 rounded-sm border border-line px-4 py-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-base font-bold">Annonce</h2>
          <button
            type="button"
            onClick={() =>
              update({
                title: generateTitle(current),
                description: generateDescription(current),
              })
            }
            className="text-xs text-chalk-red"
          >
            Régénérer
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <Field label="Titre">
            <TextInput value={current.title} onCommit={(v) => update({ title: v })} />
          </Field>
          <button
            type="button"
            onClick={() => copy("title", current.title)}
            className="self-start text-xs text-ink/60 underline"
          >
            {copied === "title" ? "Titre copié" : "Copier le titre"}
          </button>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink/70">
              Description
            </span>
            <textarea
              key={current.description}
              defaultValue={current.description}
              rows={8}
              onBlur={(e) =>
                e.target.value !== current.description &&
                update({ description: e.target.value })
              }
              className="w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-base outline-none focus:border-ink"
            />
          </label>
          <button
            type="button"
            onClick={() => copy("desc", current.description)}
            className="self-start text-xs text-ink/60 underline"
          >
            {copied === "desc" ? "Description copiée" : "Copier la description"}
          </button>

          <p className="text-sm text-ink/70">
            Prix conseillé : <strong>{suggestedPrice(current)} €</strong>{" "}
            <span className="text-ink/50">
              (fourchette {current.estimateLow}–{current.estimateHigh} €)
            </span>
          </p>
        </div>
      </section>

      {/* Infos */}
      <section className="mt-6 flex flex-col gap-3.5">
        <h2 className="font-display text-base font-bold">Infos</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marque">
            <TextInput value={current.brand} onCommit={(v) => update({ brand: v.trim() })} />
          </Field>
          <Field label="Taille">
            <TextInput value={current.size} onCommit={(v) => update({ size: v.trim() })} />
          </Field>
        </div>
        <Field label="Catégorie">
          <SelectInput
            value={current.category}
            onChange={(v) => update({ category: v })}
            options={CATEGORIES.includes(current.category as (typeof CATEGORIES)[number]) ? CATEGORIES : [current.category, ...CATEGORIES]}
          />
        </Field>
        <Field label="État">
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map((c) => (
              <Chip
                key={c.value}
                active={current.condition === c.value}
                onClick={() => update({ condition: c.value as Condition })}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Référence / SKU">
            <TextInput value={current.sku} onCommit={(v) => update({ sku: v.trim() })} />
          </Field>
          <Field label="Plateforme">
            <SelectInput
              value={current.platform}
              onChange={(v) => update({ platform: v })}
              options={PLATFORMS}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix d'achat">
            <NumberInput
              value={current.purchasePrice}
              onCommit={(v) => update({ purchasePrice: v ?? 0 })}
            />
          </Field>
          <Field label="Date d'achat">
            <TextInput
              type="date"
              value={current.purchaseDate}
              onCommit={(v) => v && update({ purchaseDate: v })}
            />
          </Field>
        </div>
      </section>

      {/* Vente */}
      <section className="mt-6 flex flex-col gap-3.5">
        <h2 className="font-display text-base font-bold">Vente</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix mis en vente">
            <NumberInput
              value={current.listedPrice}
              onCommit={(v) => update({ listedPrice: v })}
            />
          </Field>
          <Field label="Prix de vente">
            <NumberInput value={current.soldPrice} onCommit={setSoldPrice} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de vente">
            <TextInput
              type="date"
              value={current.soldDate ?? ""}
              onCommit={(v) => update({ soldDate: v || null })}
            />
          </Field>
          <Field label="Frais (envoi, emballage…)">
            <NumberInput
              value={current.fees || null}
              onCommit={(v) => update({ fees: v ?? 0 })}
            />
          </Field>
        </div>

        {net != null && (
          <div className="ticket-notch rounded-sm border border-line bg-paper-dim/60 px-4 py-3.5">
            <p className="text-xs text-ink/60">Bénéfice sur cet article</p>
            <p
              className={`font-display text-2xl font-bold tabular-nums ${
                net >= 0 ? "text-sage" : "text-chalk-red"
              }`}
            >
              {net >= 0 ? "+" : ""}
              {eur(net, 2)}
            </p>
            <p className="mt-0.5 text-xs text-ink/55">
              {marginPct != null && `${marginPct.toFixed(0)} % du prix de vente`}
              {daysToSell != null && ` · vendu en ${daysToSell} jour${daysToSell > 1 ? "s" : ""}`}
            </p>
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={remove}
        className="mt-8 w-full rounded-sm border border-chalk-red py-3 text-sm font-medium text-chalk-red"
      >
        Supprimer cet article
      </button>

      {studioIndex !== null && current.photos[studioIndex] && (
        <PhotoStudio
          src={current.photos[studioIndex]}
          onClose={() => setStudioIndex(null)}
          onSave={async (dataUrl, mode) => {
            const photos =
              mode === "replace"
                ? current.photos.map((p, i) => (i === studioIndex ? dataUrl : p))
                : [
                    ...current.photos.slice(0, studioIndex + 1),
                    dataUrl,
                    ...current.photos.slice(studioIndex + 1),
                  ];
            await update({ photos });
            setStudioIndex(null);
          }}
        />
      )}
    </main>
  );
}
