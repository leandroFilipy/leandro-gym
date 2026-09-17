import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";
import { safeNextPath } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;
  return <AuthForm mode="login" next={safeNextPath(callbackUrl)} />;
}
