// Grille de prix locale, à défaut d'API publique Vinted pour les ventes réelles.
// Objectif MVP : une estimation raisonnable à affiner toi-même avec tes propres ventes
// (voir `adjustForSale` plus bas, pensé pour apprendre de ton historique).

export type Condition = "neuf_etiquette" | "tres_bon" | "bon" | "satisfaisant";

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "neuf_etiquette", label: "Neuf avec étiquette" },
  { value: "tres_bon", label: "Très bon état" },
  { value: "bon", label: "Bon état" },
  { value: "satisfaisant", label: "Satisfaisant" },
];

export const CATEGORIES = [
  "T-shirt",
  "Chemise",
  "Pull / Sweat",
  "Veste",
  "Manteau",
  "Jean",
  "Pantalon",
  "Robe",
  "Jupe",
  "Short",
  "Chaussures",
  "Sac",
  "Accessoire",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Fourchette de base en euros, pour un article "standard" en très bon état.
const BASE_RANGE: Record<Category, [number, number]> = {
  "T-shirt": [6, 14],
  Chemise: [8, 18],
  "Pull / Sweat": [10, 22],
  Veste: [15, 35],
  Manteau: [25, 55],
  Jean: [12, 28],
  Pantalon: [10, 22],
  Robe: [12, 28],
  Jupe: [8, 18],
  Short: [6, 14],
  Chaussures: [15, 35],
  Sac: [12, 30],
  Accessoire: [5, 14],
};

const CONDITION_FACTOR: Record<Condition, number> = {
  neuf_etiquette: 1.3,
  tres_bon: 1,
  bon: 0.75,
  satisfaisant: 0.55,
};

// Trois paliers de marque. Ajoute les marques que tu croises le plus souvent.
const BRAND_TIER: Record<string, number> = {
  // Luxe / très recherché
  chanel: 6,
  dior: 6,
  gucci: 5.5,
  "saint laurent": 5.5,
  celine: 5,
  hermes: 7,
  // Premium / streetwear coté
  nike: 2.2,
  adidas: 2,
  "the north face": 2.4,
  patagonia: 2.3,
  carhartt: 2,
  "ralph lauren": 2.2,
  "levi's": 1.8,
  levis: 1.8,
  stussy: 2.5,
  supreme: 4,
  "new balance": 1.9,
  vans: 1.6,
  lacoste: 1.8,
  // Standard
  zara: 1,
  "h&m": 0.9,
  mango: 1,
  uniqlo: 1.1,
  celio: 0.9,
  jules: 0.9,
  pimkie: 0.8,
  bershka: 0.85,
};

function brandMultiplier(brand: string): number {
  const key = brand.trim().toLowerCase();
  if (!key) return 0.8; // sans marque identifiée
  return BRAND_TIER[key] ?? 1; // marque inconnue → traitée comme standard
}

export interface Estimate {
  low: number;
  high: number;
}

export function estimatePrice(
  category: string,
  brand: string,
  condition: Condition
): Estimate {
  const base = BASE_RANGE[category as Category] ?? [8, 18];
  const mult = brandMultiplier(brand) * CONDITION_FACTOR[condition];
  const low = Math.max(2, Math.round(base[0] * mult));
  const high = Math.max(low + 2, Math.round(base[1] * mult));
  return { low, high };
}

export function conditionLabel(c: Condition): string {
  return CONDITIONS.find((x) => x.value === c)?.label ?? c;
}
