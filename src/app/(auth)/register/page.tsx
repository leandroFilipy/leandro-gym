import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
