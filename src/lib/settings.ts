"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export const DEFAULT_URSSAF_RATE = 12.3; // % du CA, vente de marchandises (modifiable)

export function useSetting<T>(
  key: string,
  fallback: T
): [T, (value: T) => Promise<void>] {
  const row = useLiveQuery(() => db.settings.get(key), [key]);
  const value = row ? (row.value as T) : fallback;
  const set = async (v: T) => {
    await db.settings.put({ key, value: v });
  };
  return [value, set];
}
