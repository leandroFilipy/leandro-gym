"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { reportClientError } from "@/lib/report-client-error";

/** Tela de erro dos error boundaries: registra o erro e oferece tentar de novo. */
export function ErrorView({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError(error, { digest: error.digest, kind: "error-boundary" });
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="grid size-16 place-items-center rounded-full border border-danger/40 bg-danger/10 text-danger">
        <TriangleAlert className="size-8" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold uppercase italic">Algo deu errado</h1>
        <p className="mt-1 text-sm text-muted">O erro foi registrado automaticamente. Tente de novo — se continuar, volte ao início.</p>
        {error.digest && <p className="mt-2 text-xs text-faint">Código: {error.digest}</p>}
      </div>
      <div className="flex gap-2">
        <Button onClick={retry}>
          <RotateCcw className="size-4" /> Tentar de novo
        </Button>
        <ButtonLink href="/" variant="secondary">
          Início
        </ButtonLink>
      </div>
    </div>
  );
}
