// Agrupamento de erros: o mesmo defeito gera mensagens com ids, números e URLs diferentes.
// A "chave" normalizada junta essas ocorrências num grupo só.

const MAX_MESSAGE = 2000;
const MAX_STACK = 8000;

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Mensagem e stack de qualquer valor lançado (Error, string, objeto). */
export function describeError(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return { message: truncate(error.message || error.name, MAX_MESSAGE), stack: error.stack ? truncate(error.stack, MAX_STACK) : null };
  }
  if (typeof error === "string") return { message: truncate(error, MAX_MESSAGE), stack: null };
  try {
    return { message: truncate(JSON.stringify(error) ?? String(error), MAX_MESSAGE), stack: null };
  } catch {
    return { message: String(error), stack: null };
  }
}

/** Troca partes variáveis (UUIDs, cuids, números, URLs) por marcadores. */
export function normalizeErrorMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
    .replace(/\bc[a-z0-9]{20,32}\b/g, "<id>")
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** Caminho sem query string e com segmentos de id trocados (/treino/sessao/abc → /treino/sessao/:id). */
export function normalizePath(path: string | null | undefined): string {
  if (!path) return "";
  return path
    .split("?")[0]
    .split("/")
    .map((seg) => (/^[a-z0-9-]{20,}$/i.test(seg) || /^\d+$/.test(seg) ? ":id" : seg))
    .join("/");
}

/** Mensagens que não são defeitos do app (extensões, ruído do navegador, rede do usuário). */
export function isIgnorableClientError(message: string): boolean {
  return /ResizeObserver loop|^Script error\.?$|chrome-extension:|moz-extension:|safari-extension:|Load failed$|NetworkError when attempting|Failed to fetch$|AbortError|The operation was aborted/i.test(
    message,
  );
}

export function errorGroupKey(source: string, message: string, path: string | null | undefined): string {
  return `${source}|${normalizeErrorMessage(message)}|${normalizePath(path)}`;
}
