import type { DateStr } from "./dates";

const numberFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export const fmtNumber = (n: number) => numberFmt.format(n);
export const fmtInt = (n: number) => intFmt.format(Math.round(n));
export const fmtKg = (n: number) => `${numberFmt.format(n)} kg`;
export const fmt1 = (n: number) => oneDecimal.format(n);

export function fmtSigned(n: number, digits = 1): string {
  const abs = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return abs;
}

export function fmtPercent(n: number): string {
  return `${fmtSigned(n, 1)}%`;
}

/** 11/09 */
export function fmtDayMonth(d: DateStr): string {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

/** 11/09/2026 */
export function fmtFullDate(d: DateStr): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** 01:34 */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function fmtRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}min ${s}s` : `${m}min`;
}

export const WEEKDAY_SHORT = ["", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"] as const;
export const WEEKDAY_LONG = ["", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] as const;
