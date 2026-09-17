"use client";

import { useState, useTransition } from "react";
import { Check, Link2Off, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { sharePlanAction, unsharePlanAction } from "@/server/actions/plans";

/** Gera o link da ficha e abre o compartilhamento nativo (ou copia o link). */
export function SharePlan({ planId, name, shareToken }: { planId: string; name: string; shareToken: string | null }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const share = () =>
    start(async () => {
      setError(null);
      const r = await sharePlanAction(planId);
      if (!r.ok) return setError(r.error);
      const url = `${window.location.origin}/treino/fichas/importar/${r.data.token}`;
      const text = `Minha ficha "${name}" no Leandro Gym — abra para importar:`;
      try {
        if (navigator.share) {
          await navigator.share({ title: name, text, url });
          return;
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // usuário fechou o menu
      }
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        prompt("Copie o link da ficha:", url);
      }
    });

  const unshare = () =>
    confirm("Desativar o link? Quem recebeu não vai conseguir mais importar.") &&
    start(async () => {
      const r = await unsharePlanAction(planId);
      if (!r.ok) setError(r.error);
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={pending} onClick={share}>
          {copied ? <><Check className="size-4" /> Link copiado</> : <><Share2 className="size-4" /> Compartilhar ficha</>}
        </Button>
        {shareToken && (
          <Button variant="ghost" aria-label="Desativar link" disabled={pending} onClick={unshare}>
            <Link2Off className="size-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-faint">
        {shareToken ? "Link ativo: quem abrir pode importar uma cópia desta ficha." : "Quem receber o link importa uma cópia (sem seu histórico)."}
      </p>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
