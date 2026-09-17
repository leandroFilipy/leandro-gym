"use client";

import { useActionState } from "react";
import { Download, Trash2 } from "lucide-react";
import { buttonClass, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, FormError, SubmitButton } from "@/components/ui/Field";
import { deleteAccountAction } from "@/server/actions/account";

const EXPORTS = [
  { kind: "treinos", label: "Treinos (séries)" },
  { kind: "dieta", label: "Dieta" },
  { kind: "peso", label: "Peso" },
  { kind: "medidas", label: "Medidas" },
] as const;

/** Botões de exportar (CSV) — também usados na página de excluir conta. */
export function ExportButtons() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {EXPORTS.map((e) => (
        <a key={e.kind} href={`/api/export/${e.kind}`} download className={buttonClass({ variant: "secondary", size: "sm" })}>
          <Download className="size-4" /> {e.label}
        </a>
      ))}
    </div>
  );
}

/** Card do Perfil: exportar dados e link para excluir a conta. */
export function AccountDataCard() {
  return (
    <Card>
      <CardHeader title="Seus dados" />
      <p className="mb-3 text-sm text-muted">Baixe uma cópia em planilha (abre no Excel ou Google Planilhas).</p>
      <ExportButtons />
      <div className="mt-5 border-t border-line pt-4">
        <ButtonLink href="/perfil/excluir-conta" variant="danger" block>
          <Trash2 className="size-4" /> Excluir minha conta
        </ButtonLink>
      </div>
    </Card>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Sua senha" name="password" type="password" autoComplete="current-password" required />
      <Field label='Digite "EXCLUIR" para confirmar' name="confirm" autoComplete="off" required />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton variant="danger" size="lg" block>
        Excluir definitivamente
      </SubmitButton>
    </form>
  );
}
