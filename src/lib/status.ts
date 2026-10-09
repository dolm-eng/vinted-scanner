import type { ItemStatus } from "./db";

export const STATUSES: { value: ItemStatus; label: string; dot: string }[] = [
  { value: "en_transit", label: "En transit", dot: "bg-ink/30" },
  { value: "en_attente", label: "En stock", dot: "bg-brass" },
  { value: "publie", label: "Publié", dot: "bg-ink" },
  { value: "vendu", label: "Vendu", dot: "bg-sage" },
];

export function statusMeta(status: ItemStatus) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[1];
}

export const PLATFORMS = [
  "Vinted",
  "Leboncoin",
  "Vestiaire Collective",
  "eBay",
  "Autre",
] as const;

export const EXPENSE_CATEGORIES = [
  "Emballages",
  "Envoi",
  "Matériel",
  "Déplacement",
  "Abonnement",
  "Autre",
] as const;
