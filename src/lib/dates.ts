export type Period = "mois" | "annee" | "tout";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "mois", label: "Ce mois" },
  { value: "annee", label: "Cette année" },
  { value: "tout", label: "Tout" },
];

export function todayISO(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function inPeriod(
  iso: string | null | undefined,
  period: Period,
  now: Date = new Date()
): boolean {
  if (!iso) return false;
  if (period === "tout") return true;
  const [y, m] = iso.split("-").map(Number);
  if (period === "annee") return y === now.getFullYear();
  return y === now.getFullYear() && m === now.getMonth() + 1;
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = Date.parse(toISO) - Date.parse(fromISO);
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function formatDateFR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function eur(n: number, decimals = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}
