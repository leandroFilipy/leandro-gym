import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";
import { safeNextPath } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Criar conta" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { callbackUrl } = await searchParams;
  return <AuthForm mode="register" next={safeNextPath(callbackUrl)} />;
}
