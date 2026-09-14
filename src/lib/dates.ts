// Datas "de calendário" são strings YYYY-MM-DD no fuso do usuário.
// No banco (@db.Date) viram Date à meia-noite UTC.

export type DateStr = string; // YYYY-MM-DD

export function todayIn(timezone: string, now: Date = new Date()): DateStr {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function hourIn(timezone: string, now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(h);
}

export function toDbDate(d: DateStr): Date {
  return new Date(`${d}T00:00:00.000Z`);
}

export function fromDbDate(d: Date): DateStr {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: DateStr, days: number): DateStr {
  const date = toDbDate(d);
  date.setUTCDate(date.getUTCDate() + days);
  return fromDbDate(date);
}

/** ISO: 1 = segunda … 7 = domingo */
export function isoWeekday(d: DateStr): number {
  const day = toDbDate(d).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfIsoWeek(d: DateStr): DateStr {
  return addDays(d, 1 - isoWeekday(d));
}

export function daysBetween(a: DateStr, b: DateStr): number {
  return Math.round((toDbDate(b).getTime() - toDbDate(a).getTime()) / 86_400_000);
}

export function isValidDateStr(d: string): d is DateStr {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(toDbDate(d).getTime());
}
