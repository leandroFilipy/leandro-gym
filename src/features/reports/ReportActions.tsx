"use client";

import { useState } from "react";
import { Check, FileDown, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Salvar como PDF (impressão do navegador) e compartilhar o resumo em texto. */
export function ReportActions({ title, summary }: { title: string; summary: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `${title}\n\n${summary}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("Copie o resumo:", text);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 print:hidden">
      <Button variant="secondary" onClick={() => window.print()}>
        <FileDown className="size-4" /> Salvar PDF
      </Button>
      <Button variant="secondary" onClick={share}>
        {copied ? <><Check className="size-4" /> Copiado</> : <><Share2 className="size-4" /> Compartilhar</>}
      </Button>
    </div>
  );
}
