import type { Expense, Item } from "./db";
import { daysBetween, inPeriod, todayISO, type Period } from "./dates";

export interface Bilan {
  revenue: number; // chiffre d'affaires (ventes)
  cogs: number; // prix d'achat des articles vendus
  itemFees: number; // frais liés aux ventes
  grossMargin: number;
  marginPct: number | null;
  expenses: number; // dépenses hors achat de stock
  net: number; // bénéfice net avant cotisations
  urssaf: number; // cotisations estimées
  netAfterUrssaf: number;
  soldCount: number;
  avgBasket: number | null;
  avgDaysToSell: number | null;
  stockValue: number;
  stockCount: number;
}

export function soldDateOf(item: Item): string | null {
  if (item.status !== "vendu") return null;
  return item.soldDate ?? todayISO(new Date(item.updatedAt));
}

export function computeBilan(
  items: Item[],
  expenses: Expense[],
  period: Period,
  urssafRate: number,
  now: Date = new Date()
): Bilan {
  const sold = items.filter(
    (i) => i.status === "vendu" && inPeriod(soldDateOf(i), period, now)
  );

  const revenue = sold.reduce((s, i) => s + (i.soldPrice ?? 0), 0);
  const cogs = sold.reduce((s, i) => s + i.purchasePrice, 0);
  const itemFees = sold.reduce((s, i) => s + (i.fees ?? 0), 0);
  const grossMargin = revenue - cogs - itemFees;

  const expensesTotal = expenses
    .filter((e) => inPeriod(e.date, period, now))
    .reduce((s, e) => s + e.amount, 0);

  const net = grossMargin - expensesTotal;
  const urssaf = revenue * (urssafRate / 100);

  const daysList = sold
    .map((i) => {
      const sd = soldDateOf(i);
      return sd && i.purchaseDate ? daysBetween(i.purchaseDate, sd) : null;
    })
    .filter((d): d is number => d !== null);

  const inStock = items.filter((i) => i.status !== "vendu");

  return {
    revenue,
    cogs,
    itemFees,
    grossMargin,
    marginPct: revenue > 0 ? (grossMargin / revenue) * 100 : null,
    expenses: expensesTotal,
    net,
    urssaf,
    netAfterUrssaf: net - urssaf,
    soldCount: sold.length,
    avgBasket: sold.length > 0 ? revenue / sold.length : null,
    avgDaysToSell:
      daysList.length > 0
        ? daysList.reduce((a, b) => a + b, 0) / daysList.length
        : null,
    stockValue: inStock.reduce((s, i) => s + i.purchasePrice, 0),
    stockCount: inStock.length,
  };
}

export function itemNet(item: Item): number | null {
  if (item.soldPrice == null) return null;
  return item.soldPrice - item.purchasePrice - (item.fees ?? 0);
}
