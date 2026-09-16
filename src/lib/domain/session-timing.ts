// Tempo efetivo de treino, descontando pausas.
//
// elapsed = (agora − início) − pausasAcumuladas − (pausado agora ? agora − pausadoDesde : 0)

export interface SessionTiming {
  startedAtMs: number; // início da sessão
  pausedSeconds: number; // total já acumulado de pausa
  pausedAtMs: number | null; // se pausado, quando pausou; senão null
}

/** Segundos efetivos de treino em `nowMs` (nunca negativo). */
export function elapsedSeconds(t: SessionTiming, nowMs: number): number {
  const gross = (nowMs - t.startedAtMs) / 1000;
  const openPause = t.pausedAtMs != null ? (nowMs - t.pausedAtMs) / 1000 : 0;
  return Math.max(0, Math.floor(gross - t.pausedSeconds - openPause));
}

export const isPaused = (t: Pick<SessionTiming, "pausedAtMs">): boolean => t.pausedAtMs != null;
