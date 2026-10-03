import Dexie, { type EntityTable } from "dexie";

export type ItemStatus = "en_attente" | "publie" | "vendu";

export type Condition = "neuf_etiquette" | "tres_bon" | "bon" | "satisfaisant";

export interface Item {
  id: string;
  photo: string; // data URL (base64), stored locally in IndexedDB
  category: string;
  brand: string;
  size: string;
  condition: Condition;
  title: string;
  description: string;
  purchasePrice: number;
  estimateLow: number;
  estimateHigh: number;
  listedPrice: number | null;
  soldPrice: number | null;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
}

class VintedScannerDB extends Dexie {
  items!: EntityTable<Item, "id">;

  constructor() {
    super("vinted-scanner");
    this.version(1).stores({
      items: "id, status, createdAt, brand, category",
    });
  }
}

export const db = new VintedScannerDB();

export function newId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
  );
}
