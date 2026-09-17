import type { FoodUnit } from "@/generated/prisma/enums";
import type { Macros } from "./types";

/** EAN-8, UPC-A (12), EAN-13 e GTIN-14 com dígito verificador válido. */
export function isValidBarcode(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((n, d, i) => n + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function normalizeBarcode(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Variações do mesmo produto: UPC-A (12) ↔ EAN-13 com zero à esquerda. */
export function barcodeVariants(code: string): string[] {
  if (code.length === 12) return [code, `0${code}`];
  if (code.length === 13 && code.startsWith("0")) return [code, code.slice(1)];
  return [code];
}

/** Recorte do JSON do Open Food Facts (API v2) que usamos. */
export interface OffProduct {
  product_name?: string;
  product_name_pt?: string;
  generic_name_pt?: string;
  brands?: string;
  quantity?: string;
  image_front_small_url?: string;
  image_front_url?: string;
  nutriments?: Record<string, number | string | undefined>;
}

export interface FoodDraft extends Macros {
  name: string;
  servingSize: number;
  unit: FoodUnit;
  imageUrl: string | null;
}

function num(v: number | string | undefined): number | null {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Dados parciais para pré-preencher o cadastro manual de um alimento. */
export type FoodPrefill = Partial<FoodDraft>;

/** Nome, unidade e foto de um produto, mesmo sem tabela nutricional. null se não tiver nome. */
export function offProductBasics(p: OffProduct): Pick<FoodDraft, "name" | "unit" | "imageUrl"> | null {
  const baseName = (p.product_name_pt || p.product_name || p.generic_name_pt || "").trim();
  if (!baseName) return null;
  const brand = p.brands?.split(",")[0]?.trim();
  const name = brand && !baseName.toLowerCase().includes(brand.toLowerCase()) ? `${baseName} (${brand})` : baseName;
  const liquid = /\d\s*(ml|cl|l)\b/i.test(p.quantity ?? "");
  return { name: name.slice(0, 80), unit: liquid ? "ML" : "G", imageUrl: p.image_front_small_url || p.image_front_url || null };
}

/**
 * Converte um produto do Open Food Facts em rascunho de alimento (por 100 g ou 100 ml).
 * Retorna null se faltar nome ou calorias (dados incompletos demais para usar).
 */
export function offProductToFood(p: OffProduct): FoodDraft | null {
  const n = p.nutriments ?? {};
  const basics = offProductBasics(p);
  if (!basics) return null;

  const kj = num(n["energy_100g"]);
  const kcal = num(n["energy-kcal_100g"]) ?? (kj !== null ? kj / 4.184 : null);
  if (kcal === null) return null;

  return {
    ...basics,
    servingSize: 100,
    kcal: Math.round(kcal),
    protein: round1(num(n["proteins_100g"]) ?? 0),
    carbs: round1(num(n["carbohydrates_100g"]) ?? 0),
    fat: round1(num(n["fat_100g"]) ?? 0),
  };
}
