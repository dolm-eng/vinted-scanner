"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import { db, newId } from "@/lib/db";
import {
  CATEGORIES,
  CONDITIONS,
  estimatePrice,
  type Condition,
} from "@/lib/priceGuide";

type Step = "photo" | "details";

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("photo");
  const [photo, setPhoto] = useState<string | null>(null);

  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState<Condition>("tres_bon");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [saving, setSaving] = useState(false);

  const estimate = useMemo(
    () => estimatePrice(category, brand, condition),
    [category, brand, condition]
  );

  async function save() {
    if (!photo) return;
    setSaving(true);
    const now = Date.now();
    await db.items.add({
      id: newId(),
      photo,
      category,
      brand: brand.trim(),
      size: size.trim(),
      condition,
      title: [brand.trim(), category].filter(Boolean).join(" "),
      description: "",
      purchasePrice: Number(purchasePrice) || 0,
      estimateLow: estimate.low,
      estimateHigh: estimate.high,
      listedPrice: null,
      soldPrice: null,
      status: "en_attente",
      createdAt: now,
      updatedAt: now,
    });
    router.push("/inventory");
  }

  if (step === "photo") {
    return (
      <main className="mx-auto max-w-md px-4 pt-6">
        <h1 className="font-display text-xl font-bold">
          Scanner un article
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Cadre l&apos;article à plat, lumière naturelle si possible.
        </p>
        <div className="mt-4">
          <CameraCapture
            onCapture={(dataUrl) => {
              setPhoto(dataUrl);
              setStep("details");
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 pt-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStep("photo")}
          className="text-sm text-ink/60"
          aria-label="Reprendre la photo"
        >
          ← Photo
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="Article scanné"
            className="h-24 w-24 flex-none rounded-sm border border-line object-cover"
          />
        )}
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold">
            Détails de l&apos;article
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Quelques infos pour une estimation fiable.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Field label="Catégorie">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-base"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Marque">
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex. Nike, Zara, sans marque…"
            className="w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-base"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Taille">
            <input
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="M, 40, …"
              className="w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-base"
            />
          </Field>
          <Field label="Prix d'achat">
            <div className="flex items-center rounded-sm border border-line bg-paper px-3">
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

        <div className="ticket-notch mt-1 rounded-sm border border-line bg-paper-dim/60 px-4 py-4">
          <p className="text-xs text-ink/60">Estimation Vinted</p>
          <p className="font-display text-3xl font-bold tabular-nums">
            {estimate.low}–{estimate.high} €
          </p>
          <p className="mt-1 text-xs text-ink/50">
            Grille locale par catégorie / marque / état — affine-la avec tes
            propres ventes.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-2 rounded-sm bg-chalk-red py-3.5 font-display text-base font-bold text-paper disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Ajouter au stock"}
        </button>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink/70">
        {label}
      </span>
      {children}
    </label>
  );
}
