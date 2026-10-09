type Cell = string | number | null | undefined;

export function toCSV(rows: Cell[][]): string {
  const esc = (c: Cell) => {
    const s = c == null ? "" : String(c);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Séparateur ";" + BOM : s'ouvre correctement dans Excel en français.
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

export function downloadFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
