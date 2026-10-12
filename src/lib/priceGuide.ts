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
  "Polo",
  "Maillot de foot / sport",
  "Chemise",
  "Pull / Sweat",
  "Survêtement",
  "Veste",
  "Doudoune",
  "Manteau",
  "Jean",
  "Pantalon",
  "Robe",
  "Jupe",
  "Short",
  "Chaussures",
  "Sac",
  "Casquette / Bonnet",
  "Accessoire",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Fourchette de base en euros, pour un article de marque "standard" (Zara, Mango…) en très bon état.
const BASE_RANGE: Record<Category, [number, number]> = {
  "T-shirt": [6, 14],
  Polo: [7, 16],
  "Maillot de foot / sport": [10, 25],
  Chemise: [8, 18],
  "Pull / Sweat": [10, 22],
  Survêtement: [12, 28],
  Veste: [15, 35],
  Doudoune: [20, 45],
  Manteau: [25, 55],
  Jean: [12, 28],
  Pantalon: [10, 22],
  Robe: [12, 28],
  Jupe: [8, 18],
  Short: [6, 14],
  Chaussures: [15, 35],
  Sac: [12, 30],
  "Casquette / Bonnet": [5, 12],
  Accessoire: [5, 14],
};

const CONDITION_FACTOR: Record<Condition, number> = {
  neuf_etiquette: 1.3,
  tres_bon: 1,
  bon: 0.75,
  satisfaisant: 0.55,
};

/** Bonus "vintage / Y2K / pièce recherchée" (années 90-2000, gros logo, coupe tendance). */
export const VINTAGE_FACTOR = 1.35;

// Multiplicateur par marque (1 = marque standard type Zara). Ordres de grandeur à affiner avec tes ventes.
const BRAND_TIER: Record<string, number> = {
  // Luxe
  hermes: 7, chanel: 6, dior: 6, "louis vuitton": 6, gucci: 5.5, "saint laurent": 5.5, ysl: 5.5,
  prada: 5.5, "miu miu": 5.5, fendi: 5, celine: 5, loewe: 5, "bottega veneta": 5, balenciaga: 5,
  moncler: 5, givenchy: 4.5, valentino: 4.5, "canada goose": 4.5, versace: 4, burberry: 3.8,
  // Créateurs / premium
  "stone island": 3.5, "off white": 3.5, "vivienne westwood": 3.5, "arc'teryx": 3.5, arcteryx: 3.5,
  "acne studios": 3, "isabel marant": 3, jacquemus: 3, ami: 2.8, "ami paris": 2.8, "cp company": 3,
  "maison kitsune": 2.5, kenzo: 2.4, moschino: 2.5, apc: 2.5, "a.p.c": 2.5, evisu: 2.5,
  sandro: 2, maje: 2, "zadig & voltaire": 2.2, "zadig et voltaire": 2.2, sezane: 2.2, rouje: 2,
  "ba&sh": 2, "the kooples": 1.8, "claudie pierlot": 1.8, longchamp: 2.2, "hugo boss": 1.8, boss: 1.8,
  "emporio armani": 1.8, armani: 1.8, ea7: 1.6, "fred perry": 1.7, cos: 1.6, "massimo dutti": 1.5,
  arket: 1.4, "& other stories": 1.4, "comptoir des cotonniers": 1.4,
  // Streetwear / sport
  supreme: 4, bape: 4, "a bathing ape": 4, palace: 3.5, corteiz: 3.5, "chrome hearts": 5,
  stussy: 2.5, trapstar: 2.5, "true religion": 2, "ed hardy": 1.8, "von dutch": 1.8,
  jordan: 2.6, "air jordan": 2.6, nike: 2.2, adidas: 2, "the north face": 2.4, tnf: 2.4,
  patagonia: 2.3, carhartt: 2, "ralph lauren": 2.2, "polo ralph lauren": 2.2, lacoste: 1.8,
  "levi's": 1.8, levis: 1.8, "tommy hilfiger": 1.6, tommy: 1.6, "new balance": 1.9, asics: 1.7,
  salomon: 2.2, lululemon: 2.2, "dr martens": 2.2, "dr. martens": 2.2, ugg: 2, timberland: 1.8,
  birkenstock: 1.8, vans: 1.6, converse: 1.5, dickies: 1.6, napapijri: 1.6, diesel: 1.6,
  "juicy couture": 1.6, champion: 1.4, "calvin klein": 1.4, puma: 1.3, reebok: 1.3, fila: 1.3,
  ellesse: 1.3, kappa: 1.3, umbro: 1.3, "le coq sportif": 1.3, "g-star": 1.3, guess: 1.2,
  // Standard
  uniqlo: 1.1, zara: 1, mango: 1, "h&m": 0.9, hm: 0.9, celio: 0.9, jules: 0.9, bonobo: 0.8,
  springfield: 0.8, promod: 0.8, etam: 0.8, pimkie: 0.8, bershka: 0.85, "pull&bear": 0.85,
  "pull and bear": 0.85, stradivarius: 0.85, asos: 0.8, decathlon: 0.8, jennyfer: 0.7,
  camaieu: 0.7, "c&a": 0.7, kiabi: 0.6, primark: 0.6, gemo: 0.6, tex: 0.6, "la halle": 0.6,
  boohoo: 0.6, prettylittlething: 0.6, shein: 0.5,
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const BRAND_KEYS = Object.keys(BRAND_TIER).sort((a, b) => b.length - a.length);

/** Trouve la marque connue dans ce que tu as tapé ("Nike Air Max 90" → nike). */
export function matchBrand(brand: string): { key: string; mult: number } | null {
  const b = normalize(brand);
  if (!b) return null;
  if (BRAND_TIER[b] !== undefined) return { key: b, mult: BRAND_TIER[b] };
  const padded = ` ${b.replace(/[^a-z0-9'&.]+/g, " ")} `;
  for (const k of BRAND_KEYS) {
    if (padded.includes(` ${k} `)) return { key: k, mult: BRAND_TIER[k] };
  }
  return null;
}

export interface Estimate {
  low: number;
  high: number;
  /** Marque reconnue dans la grille (null si vide ou inconnue). */
  brandKey: string | null;
  brandMult: number;
}

export function estimatePrice(
  category: string,
  brand: string,
  condition: Condition,
  vintage = false
): Estimate {
  const base = BASE_RANGE[category as Category] ?? [8, 18];
  const match = matchBrand(brand);
  const brandMult = match ? match.mult : brand.trim() ? 1 : 0.8;
  const mult = brandMult * CONDITION_FACTOR[condition] * (vintage ? VINTAGE_FACTOR : 1);
  const low = Math.max(2, Math.round(base[0] * mult));
  const high = Math.max(low + 2, Math.round(base[1] * mult));
  return { low, high, brandKey: match?.key ?? null, brandMult };
}

/** Recherche Vinted des articles similaires, pour vérifier les vrais prix. */
export function vintedSearchUrl(category: string, brand: string, size: string): string {
  const q = [brand.trim(), category.split(" / ")[0], size.trim()].filter(Boolean).join(" ");
  return `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(q)}`;
}

export function conditionLabel(c: Condition): string {
  return CONDITIONS.find((x) => x.value === c)?.label ?? c;
}
