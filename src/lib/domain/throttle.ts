// Limite de tentativas: N falhas dentro de uma janela bloqueiam a chave por um tempo.

export interface ThrottlePolicy {
  maxFailures: number;
  windowMs: number;
  lockMs: number;
}

export interface ThrottleState {
  failures: number;
  windowStart: Date;
  lockedUntil: Date | null;
}

export const LOGIN_EMAIL_POLICY: ThrottlePolicy = { maxFailures: 5, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
export const LOGIN_IP_POLICY: ThrottlePolicy = { maxFailures: 20, windowMs: 15 * 60_000, lockMs: 15 * 60_000 };
export const RESET_POLICY: ThrottlePolicy = { maxFailures: 3, windowMs: 60 * 60_000, lockMs: 60 * 60_000 };

/** Bloqueada agora? Devolve os minutos restantes (arredondados para cima) ou null. */
export function lockedMinutes(state: ThrottleState | null, now: Date): number | null {
  if (!state?.lockedUntil || state.lockedUntil <= now) return null;
  return Math.ceil((state.lockedUntil.getTime() - now.getTime()) / 60_000);
}

/** Registra uma falha (ou um uso, no caso de limite de pedidos) e devolve o novo estado. */
export function registerFailure(state: ThrottleState | null, now: Date, policy: ThrottlePolicy): ThrottleState {
  const windowExpired = !state || now.getTime() - state.windowStart.getTime() > policy.windowMs;
  const lockExpired = state?.lockedUntil != null && state.lockedUntil <= now;
  const base = windowExpired || lockExpired ? { failures: 0, windowStart: now } : { failures: state!.failures, windowStart: state!.windowStart };
  const failures = base.failures + 1;
  return {
    failures,
    windowStart: base.windowStart,
    lockedUntil: failures >= policy.maxFailures ? new Date(now.getTime() + policy.lockMs) : null,
  };
}
