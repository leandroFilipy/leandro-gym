import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";
import { safeNextPath } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl, conta, senha } = await searchParams;
  const notice =
    conta === "excluida" ? "Sua conta e todos os dados foram excluídos." : senha === "redefinida" ? "Senha alterada ✅ Entre com a senha nova." : null;
  return (
    <>
      {notice && <p className="mb-6 rounded-md border-l-4 border-accent bg-accent/10 px-3 py-2 text-sm text-muted">{notice}</p>}
      <AuthForm mode="login" next={safeNextPath(callbackUrl)} />
    </>
  );
}
