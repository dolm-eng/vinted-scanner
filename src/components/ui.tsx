"use client";

import { useEffect, useState } from "react";

const INPUT_CLASS =
  "w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-base outline-none focus:border-ink";

export function Field({
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

export function Chip({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-none rounded-full border ${
        small ? "px-3 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
      } ${
        active ? "border-ink bg-ink text-paper" : "border-line text-ink/70"
      }`}
    >
      {children}
    </button>
  );
}

export function TextInput({
  value,
  onCommit,
  placeholder,
  type = "text",
  inputMode,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "decimal" | "numeric";
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      type={type}
      value={v}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      className={INPUT_CLASS}
    />
  );
}

export function NumberInput({
  value,
  onCommit,
  suffix = "€",
  placeholder = "—",
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  suffix?: string;
  placeholder?: string;
}) {
  const toText = (n: number | null) => (n == null ? "" : String(n));
  const [v, setV] = useState(toText(value));
  useEffect(() => setV(toText(value)), [value]);

  function commit() {
    const trimmed = v.trim().replace(",", ".");
    const parsed = trimmed === "" ? null : Number(trimmed);
    const next = parsed != null && Number.isFinite(parsed) ? parsed : null;
    if (next !== value) onCommit(next);
    else setV(toText(value));
  }

  return (
    <div className="flex items-center rounded-sm border border-line bg-paper px-3 focus-within:border-ink">
      <input
        value={v}
        inputMode="decimal"
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        className="w-full bg-transparent py-2.5 text-base outline-none"
      />
      <span className="text-ink/50">{suffix}</span>
    </div>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[] | { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT_CLASS}
    >
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}

export function PageTitle({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-baseline justify-between">
      <h1 className="font-display text-xl font-bold">{children}</h1>
      {right}
    </header>
  );
}

export function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "accent";
  hint?: string;
}) {
  const color =
    tone === "good"
      ? "text-sage"
      : tone === "bad" || tone === "accent"
        ? "text-chalk-red"
        : "";
  return (
    <div className="ticket-notch rounded-sm border border-line bg-paper-dim/60 px-3.5 py-3">
      <p className={`font-display text-xl font-bold tabular-nums ${color}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-ink/60">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink/45">{hint}</p>}
    </div>
  );
}
