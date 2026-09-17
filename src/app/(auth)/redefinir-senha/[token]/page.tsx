import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/features/auth/PasswordForms";
import { isResetTokenValid } from "@/server/services/password-reset";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPasswordPage({ params }: PageProps<"/redefinir-senha/[token]">) {
  const { token } = await params;
  if (!(await isResetTokenValid(token))) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold uppercase italic leading-none">Link inválido</h1>
        <p className="text-sm text-muted">Este link expirou ou já foi usado. Peça um novo — ele vale por 1 hora.</p>
        <Link href="/esqueci-senha" className="text-center text-sm font-medium text-accent">
          Pedir novo link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={token} />;
}
