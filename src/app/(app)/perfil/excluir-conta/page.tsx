import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { DeleteAccountForm, ExportButtons } from "@/features/profile/AccountDataCard";
import { requireUserId } from "@/server/session";

export const metadata: Metadata = { title: "Excluir conta" };

export default async function DeleteAccountPage() {
  await requireUserId();
  return (
    <>
      <PageHeader title="Excluir conta" back="/perfil" />
      <div className="flex flex-col gap-4">
        <p className="rounded-md border-l-4 border-danger bg-danger/10 px-3 py-2 text-sm text-muted">
          Isso apaga <strong className="text-fg">tudo</strong>: treinos, fichas, dieta, peso, medidas e fotos. <strong className="text-fg">Não dá para desfazer.</strong>
        </p>
        <Card>
          <CardHeader title="Antes, se quiser, baixe seus dados" />
          <ExportButtons />
        </Card>
        <Card>
          <DeleteAccountForm />
        </Card>
      </div>
    </>
  );
}
