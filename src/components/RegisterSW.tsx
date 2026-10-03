"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencieux : l'app reste utilisable sans mode hors-ligne.
      });
    }
  }, []);

  return null;
}
