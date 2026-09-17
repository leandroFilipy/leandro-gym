import "server-only";
import { db } from "../db";

export const ERROR_WINDOW_DAYS = [1, 7, 30] as const;

export function countRecentErrors(hours = 24) {
  return db.errorLog.count({ where: { createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) } } });
}

/** Erros agrupados por fingerprint, mais recentes primeiro. */
export async function getErrorGroups(days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.errorLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: { id: true, fingerprint: true, source: true, message: true, stack: true, path: true, digest: true, userId: true, userAgent: true, createdAt: true },
  });

  const groups = new Map<
    string,
    { fingerprint: string; source: string; message: string; path: string | null; count: number; users: Set<string>; firstSeen: Date; lastSeen: Date; sample: (typeof rows)[number] }
  >();
  for (const r of rows) {
    const g = groups.get(r.fingerprint);
    if (!g) {
      groups.set(r.fingerprint, { fingerprint: r.fingerprint, source: r.source, message: r.message, path: r.path, count: 1, users: new Set(r.userId ? [r.userId] : []), firstSeen: r.createdAt, lastSeen: r.createdAt, sample: r });
      continue;
    }
    g.count++;
    if (r.userId) g.users.add(r.userId);
    g.firstSeen = r.createdAt; // linhas em ordem decrescente: a última vista é a mais antiga
  }

  return [...groups.values()].map(({ users, ...g }) => ({ ...g, userCount: users.size }));
}
