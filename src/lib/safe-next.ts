/**
 * Destino pós-login vindo da URL (`callbackUrl`). Só aceita caminhos internos — uma URL
 * absoluta vira apenas caminho + query, então nunca redireciona para outro domínio.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value) return "/";
  try {
    const url = new URL(value, "http://interno");
    const path = url.pathname + url.search;
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/login") && !path.startsWith("/register") ? path : "/";
  } catch {
    return "/";
  }
}
