"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

// Substitui o layout raiz quando ele quebra: sem CSS global, então os estilos são inline.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError(error, { digest: error.digest, kind: "global-error" });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#0c0c0b", color: "#f4f1ea", fontFamily: "system-ui, sans-serif", padding: 16, textAlign: "center" }}>
        <title>Erro · Leandro Gym</title>
        <div>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Algo deu errado</h1>
          <p style={{ color: "#a8a39a", margin: "0 0 16px" }}>O erro foi registrado automaticamente.</p>
          <button type="button" onClick={retry} style={{ background: "#ff5b14", color: "#0c0c0b", border: 0, borderRadius: 6, padding: "10px 18px", fontWeight: 700, fontSize: 16 }}>
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
