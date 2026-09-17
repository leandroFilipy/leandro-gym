import { describeError, isIgnorableClientError } from "./domain/error-fingerprint";

// Envia erros do navegador para /api/errors. Limitado por página para não inundar em loops.

const MAX_PER_PAGE = 10;
const sent = new Set<string>();

export function reportClientError(error: unknown, extra?: { digest?: string; kind?: string }) {
  try {
    const { message, stack } = describeError(error);
    if (!message || isIgnorableClientError(message)) return;
    const key = `${message}|${extra?.digest ?? ""}`;
    if (sent.has(key) || sent.size >= MAX_PER_PAGE) return;
    sent.add(key);

    const body = JSON.stringify({ message, stack, digest: extra?.digest, kind: extra?.kind, path: location.pathname + location.search });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/errors", blob)) {
      void fetch("/api/errors", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // nunca deixar o relatório de erro causar outro erro
  }
}
