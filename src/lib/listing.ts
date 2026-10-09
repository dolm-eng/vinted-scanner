import type { Item } from "./db";
import { conditionLabel } from "./priceGuide";

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Titre court et dense, dans l'esprit de ce qui marche sur Vinted : marque + type + taille. */
export function generateTitle(item: Pick<Item, "brand" | "category" | "size" | "condition">): string {
  const parts = [
    item.brand.trim(),
    item.category.trim(),
    item.size.trim() ? `taille ${item.size.trim()}` : "",
    item.condition === "neuf_etiquette" ? "neuf avec étiquette" : "",
  ].filter(Boolean);
  const title = parts.join(" ");
  return title.length > 60 ? title.slice(0, 57).trimEnd() + "…" : title;
}

export function generateDescription(
  item: Pick<Item, "brand" | "category" | "size" | "condition" | "sku">
): string {
  const lines: string[] = [];
  const brand = item.brand.trim();
  lines.push(
    `${item.category}${brand ? ` ${brand}` : ""}${
      item.size.trim() ? `, taille ${item.size.trim()}` : ""
    }.`
  );
  lines.push(`État : ${conditionLabel(item.condition).toLowerCase()}.`);
  lines.push("");
  lines.push("Vendu tel que sur les photos, qui font partie de la description.");
  lines.push("Envoi rapide et soigné. Lot possible, n'hésite pas à me demander.");
  lines.push("Une question ou une offre ? Écris-moi, je réponds vite.");

  const tags = [brand && `#${slug(brand)}`, `#${slug(item.category)}`, "#vinted", "#secondemain"]
    .filter(Boolean)
    .filter((t, i, arr) => t.length > 2 && arr.indexOf(t) === i);
  lines.push("");
  lines.push(tags.join(" "));
  return lines.join("\n");
}

export function suggestedPrice(item: Pick<Item, "estimateLow" | "estimateHigh">): number {
  return Math.round((item.estimateLow + item.estimateHigh) / 2);
}
