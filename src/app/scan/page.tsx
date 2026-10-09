"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import PhotoStudio from "@/components/PhotoStudio";
import { Field, SelectInput } from "@/components/ui";
import { db, newId, type Condition } from "@/lib/db";
import { eur, todayISO } from "@/lib/dates";
import { generateDescription, generateTitle } from "@/lib/listing";
import { CATEGORIES, CONDITIONS, estimatePrice } from "@/lib/priceGuide";
import { PLATFORMS } from "@/lib/status";

type Step = "photo" | "details";

const INPUT =
  "w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-base outline-none focus:border-ink";

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("photo");
  const [photos, setPhotos] = useState<string[]>([]);
  const [studioIndex, setStudioIndex] = useState<number | null>(null);

  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState<Condition>("tres_bon");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [sku, setSku] = useState("");
  const [platform, setPlatform] = useState<string>(PLATFORMS[0]);
  const [saving, setSaving] = useState(false);

  const estimate = useMemo(
    () => estimatePrice(category, brand, condition),
    [category, brand, condition]
  );

  const purchase = Number(purchasePrice.replace(",", ".")) || 0;
  const mid = (estimate.low + estimate.high) / 2;
  const verdict = useMemo(() => {
    if (purchase <= 0) return null;
    const mult = mid / purchase;
    if (mult >= 3) return { label: "Excellent plan", tone: "text-sage", mult };
    if (mult >= 2) return { label: "Bon plan", tone: "text-sage", mult };
    if (mult >= 1.4) return { label: "Marge serrée", tone: "text-brass-dim", mult };
    return { label: "À éviter", tone: "text-chalk-red", mult };
  }, [purchase, mid]);
  const maxBuy = Math.floor(mid / 2);

  function resetForm() {
    setPhotos([]);
    setBrand("");
    setSize("");
    setPurchasePrice("");
    setSku("");
    setCondition("tres_bon");
    setStep("photo");
  }

  async function save(next: boolean) {
    if (photos.length === 0) return;
    setSaving(true);
    const now = Date.now();
    const id = newId();
    const base = { brand: brand.trim(), category, size: size.trim(), condition, sku: sku.trim() };
    await db.items.add({
      id,
      photos,
      ...base,
      title: generateTitle(base),
      description: generateDescription(base),
      platform,
      purchasePrice: purchase,
      purchaseDate,
      estimateLow: estimate.low,
      estimateHigh: estimate.high,
      listedPrice: null,
      soldPrice: null,
      soldDate: null,
      fees: 0,
      status: "en_attente",
      createdAt: now,
      updatedAt: now,
    });
    setSaving(false);
    if (next) resetForm();
    else router.push(`/item/${id}`);
  }

  if (step === "photo") {
    return (
      <main className="mx-auto max-w-md px-4 pt-6">
        <h1 className="font-display text-xl font-bold">Scanner un article</h1>
        <p className="mt-1 text-sm text-ink/60">
          Pose l&apos;article à plat sur un fond uni, lumière naturelle si possible.
        </p>
        <div className="mt-4">
          <CameraCapture
            onCapture={(urls) => {
              setPhotos((p) => [...p, ...urls]);
              setStep("details");
            }}
          />
        </div>
        {photos.length > 0 && (
          <button
            type="button"
            onClick={() => setStep("details")}
            className="mt-3 text-sm text-chalk-red"
          >
            ← Retour au formulaire ({photos.length} photo{photos.length > 1 ? "s" : ""})
          </button>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold">Détails de l&apos;article</h1>
        <button type="button" onClick={resetForm} className="text-sm text-ink/55">
          Recommencer
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {photos.map((p, i) => (
          <div key={i} className="relative h-24 w-20 flex-none">
            <button
              type="button"
              onClick={() => setStudioIndex(i)}
              className="h-full w-full overflow-hidden rounded-sm border border-line"
              aria-label={`Retoucher la photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" className="h-full w-full object-cover" />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = photos.filter((_, idx) => idx !== i);
                setPhotos(next);
                if (next.length === 0) setStep("photo");
              }}
              aria-label={`Supprimer la photo ${i + 1}`}
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-ink text-xs leading-5 text-paper"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setStep("photo")}
          className="flex h-24 w-20 flex-none items-center justify-center rounded-sm border border-dashed border-line text-2xl text-ink/45"
          aria-label="Ajouter une photo"
        >
          +
        </button>
      </div>
      <p className="mt-1 text-xs text-ink/50">
        Touche une photo pour la retoucher. Plusieurs angles aident à vendre.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <Field label="Catégorie">
          <SelectInput value={category} onChange={setCategory} options={CATEGORIES} />
        </Field>

        <Field label="Marque">
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex. Nike, Zara, sans marque…"
            className={INPUT}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Taille">
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="M, 40, …"
              className={INPUT}
            />
          </Field>
          <Field label="Prix d'achat">
            <div className="flex items-center rounded-sm border border-line bg-paper px-3 focus-within:border-ink">
              <input
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="w-full bg-transparent py-2.5 text-base outline-none"
              />
              <span className="text-ink/50">€</span>
            </div>
          </Field>
        </div>

        <Field label="État">
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(c.value)}
                className={`rounded-sm border px-3 py-2.5 text-sm ${
                  condition === c.value
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-ink/70"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="ticket-notch rounded-sm border border-line bg-paper-dim/60 px-4 py-4">
          <p className="text-xs text-ink/60">Estimation de revente</p>
          <p className="font-display text-3xl font-bold tabular-nums">
            {estimate.low}–{estimate.high} €
          </p>
          {verdict ? (
            <p className={`mt-1.5 text-sm font-semibold ${verdict.tone}`}>
              {verdict.label} · x{verdict.mult.toFixed(1)} · gain estimé{" "}
              {eur(mid - purchase)}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-ink/70">
              Pour viser x2, achète à {eur(maxBuy)} maximum.
            </p>
          )}
          <p className="mt-1 text-xs text-ink/50">
            Grille locale par catégorie, marque et état. Compare avec les annonces
            Vinted similaires et affine avec tes ventes.
          </p>
        </div>

        <details className="rounded-sm border border-line px-3 py-2.5">
          <summary className="cursor-pointer text-sm font-medium text-ink/70">
            Plus d&apos;infos (référence, date, plateforme)
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="Référence / SKU">
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ex. A-012"
                className={INPUT}
              />
            </Field>
            <Field label="Date d'achat">
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Plateforme de vente">
              <SelectInput value={platform} onChange={setPlatform} options={PLATFORMS} />
            </Field>
          </div>
        </details>

        <button
          type="button"
          onClick={() => save(false)}
          disabled={saving}
          className="mt-1 rounded-sm bg-chalk-red py-3.5 font-display text-base font-bold text-paper disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Ajouter au stock"}
        </button>
        <button
          type="button"
          onClick={() => save(true)}
          disabled={saving}
          className="rounded-sm border border-ink py-3 text-sm font-medium disabled:opacity-60"
        >
          Enregistrer et scanner le suivant
        </button>
      </div>

      {studioIndex !== null && photos[studioIndex] && (
        <PhotoStudio
          src={photos[studioIndex]}
          onClose={() => setStudioIndex(null)}
          onSave={(dataUrl, mode) => {
            setPhotos((list) =>
              mode === "replace"
                ? list.map((p, i) => (i === studioIndex ? dataUrl : p))
                : [...list.slice(0, studioIndex + 1), dataUrl, ...list.slice(studioIndex + 1)]
            );
            setStudioIndex(null);
          }}
        />
      )}
    </main>
  );
}
