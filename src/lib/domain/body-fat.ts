// % de gordura pela fórmula da Marinha dos EUA (medidas com fita métrica, em cm).
// Erro típico de ±3–4 pontos percentuais; bom para acompanhar a tendência, não como valor exato.

export interface NavyInput {
  sex: "MALE" | "FEMALE";
  heightCm: number;
  waist: number; // na altura do umbigo
  neck: number;
  hip?: number | null; // obrigatório para mulheres
}

export function navyBodyFat({ sex, heightCm, waist, neck, hip }: NavyInput): number | null {
  if (heightCm <= 0 || waist <= 0 || neck <= 0) return null;
  let bf: number;
  if (sex === "MALE") {
    if (waist <= neck) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450;
  } else {
    if (!hip || hip <= 0 || waist + hip <= neck) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(heightCm)) - 450;
  }
  // Fora da faixa fisiológica = medida digitada errada.
  if (!Number.isFinite(bf) || bf < 2 || bf > 60) return null;
  return Math.round(bf * 10) / 10;
}

export interface BodyFatPoint {
  date: string;
  value: number;
}

/**
 * Série de % de gordura estimada: usa, em cada registro, a última cintura/pescoço/quadril
 * conhecidos até aquela data (nem todo dia mede tudo).
 */
export function navySeries(
  entries: readonly { date: string; waist?: number | null; neck?: number | null; hip?: number | null }[],
  sex: "MALE" | "FEMALE",
  heightCm: number,
): BodyFatPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const last: { waist?: number; neck?: number; hip?: number } = {};
  const out: BodyFatPoint[] = [];
  for (const e of sorted) {
    const touched = typeof e.waist === "number" || typeof e.neck === "number" || typeof e.hip === "number";
    if (typeof e.waist === "number") last.waist = e.waist;
    if (typeof e.neck === "number") last.neck = e.neck;
    if (typeof e.hip === "number") last.hip = e.hip;
    if (!touched || !last.waist || !last.neck) continue;
    const value = navyBodyFat({ sex, heightCm, waist: last.waist, neck: last.neck, hip: last.hip });
    if (value !== null) out.push({ date: e.date, value });
  }
  return out;
}

/** Faixa de referência (ACE) para exibir junto ao número. */
export function bodyFatCategory(bf: number, sex: "MALE" | "FEMALE"): string {
  const t = sex === "MALE" ? [6, 14, 18, 25] : [14, 21, 25, 32];
  if (bf < t[0]) return "Essencial";
  if (bf < t[1]) return "Atleta";
  if (bf < t[2]) return "Fitness";
  if (bf < t[3]) return "Média";
  return "Acima da média";
}
