// Idées de niches à chercher en friperie / brocante / dépôt-vente.
// ATTENTION : ce sont des ordres de grandeur indicatifs (fourchettes d'achat et de revente
// typiques), pas des prix constatés. Compare toujours avec les annonces réelles sur Vinted
// avant d'acheter, et affine ta propre grille avec tes ventes.

export type Gender = "H" | "F" | "U";
export type Season = "Hiver" | "Été" | "Mi-saison" | "Toute l'année";

export interface Niche {
  name: string;
  hint: string;
  gender: Gender;
  season: Season;
  buy: [number, number];
  resell: [number, number];
}

export const NICHES: Niche[] = [
  { name: "Doudoune The North Face / Patagonia", hint: "Nuptse, Puff, Down Sweater", gender: "U", season: "Hiver", buy: [15, 40], resell: [60, 130] },
  { name: "Polaire Patagonia Synchilla", hint: "Snap-T, Better Sweater", gender: "U", season: "Hiver", buy: [8, 25], resell: [40, 85] },
  { name: "Veste Carhartt", hint: "Detroit, Active, OG Chore", gender: "U", season: "Mi-saison", buy: [15, 40], resell: [55, 120] },
  { name: "Sweat Nike vintage", hint: "Gros logo brodé, années 90-2000", gender: "U", season: "Mi-saison", buy: [5, 15], resell: [30, 65] },
  { name: "Coupe-vent colorblock vintage", hint: "Nike, Adidas, Ellesse, Fila", gender: "U", season: "Mi-saison", buy: [5, 15], resell: [30, 70] },
  { name: "Survêtement Adidas vintage", hint: "Veste + pantalon, bandes", gender: "U", season: "Mi-saison", buy: [8, 20], resell: [35, 80] },
  { name: "Maillot de foot vintage", hint: "Clubs et sélections, équipementiers d'époque", gender: "H", season: "Toute l'année", buy: [5, 15], resell: [30, 90] },
  { name: "Jean Levi's 501 / 505", hint: "Coupe droite, made in USA si possible", gender: "U", season: "Toute l'année", buy: [6, 15], resell: [30, 60] },
  { name: "Veste en jean Levi's / Lee", hint: "Trucker, délavage naturel", gender: "U", season: "Mi-saison", buy: [8, 20], resell: [35, 70] },
  { name: "Pull Ralph Lauren en maille", hint: "Torsadé, col rond, laine", gender: "H", season: "Hiver", buy: [8, 20], resell: [35, 65] },
  { name: "Polo Ralph Lauren", hint: "Big pony, coloris vifs", gender: "H", season: "Été", buy: [4, 10], resell: [20, 40] },
  { name: "Chemise Lacoste / Ralph Lauren", hint: "Oxford, popeline", gender: "H", season: "Toute l'année", buy: [4, 10], resell: [20, 38] },
  { name: "Pantalon cargo", hint: "Large, poches latérales", gender: "U", season: "Toute l'année", buy: [5, 14], resell: [25, 55] },
  { name: "Pantalon Dickies 874", hint: "Droit, coloris basiques", gender: "U", season: "Toute l'année", buy: [5, 12], resell: [25, 45] },
  { name: "Casquette vintage", hint: "Marques sportives, brodée", gender: "U", season: "Toute l'année", buy: [2, 8], resell: [15, 40] },
  { name: "Sneakers New Balance 574 / 990", hint: "Made in USA / UK = plus cher", gender: "U", season: "Toute l'année", buy: [12, 35], resell: [50, 120] },
  { name: "Sneakers Asics Gel / Nike Air", hint: "Modèles running années 2000", gender: "U", season: "Toute l'année", buy: [10, 30], resell: [45, 100] },
  { name: "Bottes Dr. Martens", hint: "1460, 1461, made in England", gender: "U", season: "Hiver", buy: [15, 35], resell: [55, 110] },
  { name: "Sac Longchamp Pliage", hint: "Taille L ou S, état propre", gender: "F", season: "Toute l'année", buy: [10, 25], resell: [40, 80] },
  { name: "Sac à main cuir de marque française", hint: "Sandro, Maje, Lancel, Le Tanneur", gender: "F", season: "Toute l'année", buy: [10, 30], resell: [45, 110] },
  { name: "Blazer Zara / Mango", hint: "Coupe oversize, coloris neutres", gender: "F", season: "Mi-saison", buy: [3, 10], resell: [18, 35] },
  { name: "Robe d'été fleurie", hint: "Zara, Mango, Sézane, Rouje", gender: "F", season: "Été", buy: [3, 12], resell: [18, 45] },
  { name: "Robe en maille / pull long", hint: "Laine, mohair, tons chauds", gender: "F", season: "Hiver", buy: [5, 15], resell: [25, 55] },
  { name: "Manteau en laine", hint: "Long, camel ou gris, bonne marque", gender: "F", season: "Hiver", buy: [10, 30], resell: [45, 110] },
  { name: "Trench Burberry / Kiabi vintage", hint: "Coupe classique, ceinture", gender: "U", season: "Mi-saison", buy: [10, 30], resell: [40, 150] },
  { name: "Jupe plissée / tennis skirt", hint: "Tendance préppy", gender: "F", season: "Été", buy: [2, 8], resell: [15, 32] },
  { name: "Legging / brassière Lululemon", hint: "Align, Wunder Under", gender: "F", season: "Toute l'année", buy: [10, 25], resell: [35, 75] },
  { name: "Veste de ski / snowboard technique", hint: "Gore-Tex, Arc'teryx, Salomon", gender: "U", season: "Hiver", buy: [15, 45], resell: [60, 150] },
  { name: "Short de bain / short sport de marque", hint: "Nike, Adidas, Quiksilver", gender: "H", season: "Été", buy: [2, 8], resell: [12, 28] },
  { name: "T-shirt de groupe / tourisme vintage", hint: "Single stitch, années 80-90", gender: "U", season: "Été", buy: [3, 12], resell: [25, 90] },
  { name: "Écharpe / bonnet en cachemire", hint: "Étiquette 100 % cachemire", gender: "U", season: "Hiver", buy: [3, 12], resell: [20, 50] },
  { name: "Ceinture et accessoires cuir de marque", hint: "Boucle propre, pas de craquelures", gender: "U", season: "Toute l'année", buy: [2, 8], resell: [15, 40] },
];

export function nicheStats(n: Niche) {
  const buyMid = (n.buy[0] + n.buy[1]) / 2;
  const resellMid = (n.resell[0] + n.resell[1]) / 2;
  return {
    buyMid,
    resellMid,
    profit: resellMid - buyMid,
    multiplier: resellMid / buyMid,
  };
}
