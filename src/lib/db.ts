import Dexie, { type EntityTable } from "dexie";

export type ItemStatus = "en_transit" | "en_attente" | "publie" | "vendu";

export type Condition = "neuf_etiquette" | "tres_bon" | "bon" | "satisfaisant";

export interface Item {
  id: string;
  photos: string[]; // data URLs (JPEG), stockées localement dans IndexedDB
  category: string;
  brand: string;
  size: string;
  condition: Condition;
  title: string;
  description: string;
  sku: string;
  platform: string;
  purchasePrice: number;
  purchaseDate: string; // yyyy-mm-dd
  estimateLow: number;
  estimateHigh: number;
  listedPrice: number | null;
  soldPrice: number | null;
  soldDate: string | null; // yyyy-mm-dd
  fees: number; // frais liés à la vente (envoi, emballage...)
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Expense {
  id: string;
  label: string;
  category: string;
  amount: number;
  date: string; // yyyy-mm-dd
  createdAt: number;
}

export type TaskPriority = "haute" | "normale" | "basse";

export interface Task {
  id: string;
  title: string;
  dueDate: string | null; // yyyy-mm-dd
  priority: TaskPriority;
  done: boolean;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

function isoFromTimestamp(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

class GriffeDB extends Dexie {
  items!: EntityTable<Item, "id">;
  expenses!: EntityTable<Expense, "id">;
  tasks!: EntityTable<Task, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("vinted-scanner");

    this.version(1).stores({
      items: "id, status, createdAt, brand, category",
    });

    this.version(2)
      .stores({
        items: "id, status, createdAt, brand, category, sku, soldDate",
        expenses: "id, date, category",
        tasks: "id, dueDate, done",
        settings: "key",
      })
      .upgrade((tx) =>
        tx
          .table("items")
          .toCollection()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .modify((item: any) => {
            if (!Array.isArray(item.photos)) {
              item.photos = item.photo ? [item.photo] : [];
            }
            delete item.photo;
            item.sku ??= "";
            item.platform ??= "Vinted";
            item.purchaseDate ??= isoFromTimestamp(item.createdAt ?? Date.now());
            item.fees ??= 0;
            if (item.status === "vendu") {
              item.soldDate ??= isoFromTimestamp(item.updatedAt ?? Date.now());
            } else {
              item.soldDate ??= null;
            }
          })
      );
  }
}

export const db = new GriffeDB();

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
