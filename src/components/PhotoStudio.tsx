"use client";

import { useEffect, useRef, useState } from "react";
import { BG_STYLES, enhance, type BgStyle, type EnhanceResult } from "@/lib/photo";
import { Chip } from "./ui";

export default function PhotoStudio({
  src,
  canReplace = true,
  onSave,
  onClose,
}: {
  src: string;
  canReplace?: boolean;
  onSave: (dataUrl: string, mode: "replace" | "add") => void;
  onClose: () => void;
}) {
  const [bg, setBg] = useState<BgStyle>("blanc");
  const [crop, setCrop] = useState(true);
  const [levels, setLevels] = useState(true);
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    const id = ++run.current;
    setBusy(true);
    setFailed(false);
    const timer = setTimeout(() => {
      enhance(src, { bg, crop, levels })
        .then((r) => {
          if (id === run.current) {
            setResult(r);
            setBusy(false);
          }
        })
        .catch(() => {
          if (id === run.current) {
            setFailed(true);
            setBusy(false);
          }
        });
    }, 60);
    return () => clearTimeout(timer);
  }, [src, bg, crop, levels]);

  const shown = showOriginal || !result ? src : result.dataUrl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <div className="mx-auto max-w-md px-4 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onClose} className="text-sm text-ink/60">
            ← Annuler
          </button>
          <h2 className="font-display text-base font-bold">Studio photo</h2>
          <span className="w-14" />
        </div>

        <div className="relative mt-4 flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-sm border border-line bg-paper-dim">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shown}
            alt="Aperçu de la photo"
            className="h-full w-full object-contain"
          />
          {busy && (
            <div className="absolute inset-x-0 bottom-0 bg-ink/70 px-3 py-1.5 text-center text-xs text-paper">
              Traitement…
            </div>
          )}
        </div>

        <button
          type="button"
          onPointerDown={() => setShowOriginal(true)}
          onPointerUp={() => setShowOriginal(false)}
          onPointerLeave={() => setShowOriginal(false)}
          className="mt-2 w-full rounded-sm border border-line py-2 text-sm text-ink/70 select-none"
        >
          Maintiens pour voir l&apos;original
        </button>

        {failed && (
          <p className="mt-3 text-sm text-chalk-red">
            Impossible de traiter cette photo. Essaie-en une autre.
          </p>
        )}
        {result?.note && !busy && (
          <p className="mt-3 rounded-sm border border-brass/50 bg-brass/10 px-3 py-2 text-sm text-ink/80">
            {result.note}
          </p>
        )}

        <p className="mt-5 text-sm font-medium text-ink/70">Fond</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BG_STYLES.map((s) => (
            <Chip key={s.value} active={bg === s.value} onClick={() => setBg(s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2.5 text-sm">
          <Toggle label="Corriger la lumière et les couleurs" on={levels} onChange={setLevels} />
          {bg === "original" && (
            <Toggle label="Recadrer autour de l'article" on={crop} onChange={setCrop} />
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {canReplace && (
            <button
              type="button"
              disabled={busy || !result}
              onClick={() => result && onSave(result.dataUrl, "replace")}
              className="rounded-sm bg-chalk-red py-3.5 font-display text-base font-bold text-paper disabled:opacity-50"
            >
              Remplacer la photo
            </button>
          )}
          <button
            type="button"
            disabled={busy || !result}
            onClick={() => result && onSave(result.dataUrl, "add")}
            className={`rounded-sm py-3 text-sm font-medium disabled:opacity-50 ${
              canReplace
                ? "border border-ink text-ink"
                : "bg-chalk-red font-display text-base font-bold text-paper"
            }`}
          >
            {canReplace ? "Ajouter en plus (garder l'originale)" : "Utiliser cette version"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex items-center justify-between gap-3 text-left"
    >
      <span className="text-ink/80">{label}</span>
      <span
        className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
          on ? "bg-ink" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper transition-all ${
            on ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
