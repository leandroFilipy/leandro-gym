import type { Instrumentation } from "next";

// Erros não tratados do servidor (páginas, route handlers, server actions) → ErrorLog.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : null;
  // redirect() e notFound() usam exceções de controle de fluxo: não são defeitos.
  if (digest?.startsWith("NEXT_REDIRECT") || digest?.startsWith("NEXT_HTTP_ERROR_FALLBACK")) return;

  const { logError } = await import("./server/monitoring/errors");
  const userAgent = request.headers["user-agent"];
  await logError({
    source: context.routeType === "action" ? "action" : "server",
    error,
    path: request.path,
    digest,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    details: `${request.method} ${context.routePath} (${context.routeType})`,
  });
};
