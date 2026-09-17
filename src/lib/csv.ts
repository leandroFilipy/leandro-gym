// CSV no formato que o Excel em português abre direto: separador ";", vírgula decimal e BOM UTF-8
// (para os acentos aparecerem certos).

export type CsvValue = string | number | boolean | null | undefined;

function cell(v: CsvValue): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? (Number.isFinite(v) ? String(Math.round(v * 100) / 100).replace(".", ",") : "") : String(v);
  // Evita fórmula no Excel ("=", "+", "-", "@" no início de texto) e escapa aspas/quebras.
  const safe = typeof v === "string" && /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
