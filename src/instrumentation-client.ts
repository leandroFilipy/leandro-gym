import { reportClientError } from "./lib/report-client-error";

// Erros de JavaScript no navegador que escapam dos error boundaries do React.
try {
  window.addEventListener("error", (event) => {
    // Erros de scripts de outras origens chegam sem detalhes ("Script error.") e são ignorados.
    reportClientError(event.error ?? event.message, { kind: "window.error" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportClientError(event.reason, { kind: "unhandledrejection" });
  });
} catch {
  // ambiente sem window
}
