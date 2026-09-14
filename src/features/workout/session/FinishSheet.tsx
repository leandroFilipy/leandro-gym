"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { fmtInt } from "@/lib/format";
import { flushOutbox, pendingCount } from "@/lib/offline/outbox";
import { deleteSessionAction, finishSessionAction } from "@/server/actions/sessions";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  setCount: number;
  volume: number;
  pending: number;
  missing: number; // séries planejadas não feitas
}

export function FinishSheet({ open, onClose, sessionId, setCount, volume, pending, missing }: Props) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const finish = () =>
    start(async () => {
      await flushOutbox();
      if (pendingCount() > 0) {
        setError("Algumas séries ainda não sincronizaram. Conecte-se à internet e tente de novo.");
        return;
      }
      const r = await finishSessionAction(sessionId);
      if (!r.ok) return setError(r.error);
      router.push(`/treino/sessao/${sessionId}/resumo`);
    });

  return (
    <Sheet open={open} onClose={onClose} title="Finalizar treino">
      <div className="mb-4 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-2xl bg-surface-2 p-3">
          <div className="tabular text-3xl font-bold">{setCount}</div>
          <div className="text-xs text-muted">séries</div>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3">
          <div className="tabular text-3xl font-bold">{fmtInt(volume)}</div>
          <div className="text-xs text-muted">kg de volume</div>
        </div>
      </div>
      {missing > 0 && <p className="mb-3 text-sm text-warn">Faltam {missing} séries planejadas.</p>}
      {pending > 0 && <p className="mb-3 text-sm text-warn">{pending} série(s) aguardando internet para sincronizar.</p>}
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <div className="flex flex-col gap-2">
        <Button size="lg" block disabled={busy} onClick={finish}>
          {busy ? "Salvando…" : "Finalizar treino"}
        </Button>
        <Button variant="secondary" size="lg" block onClick={onClose}>
          Continuar treinando
        </Button>
        {setCount === 0 && (
          <form action={deleteSessionAction.bind(null, sessionId)}>
            <Button type="submit" variant="ghost" block className="text-danger">
              Descartar treino
            </Button>
          </form>
        )}
      </div>
    </Sheet>
  );
}
