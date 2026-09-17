"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/Field";
import { loginAction, registerAction } from "@/server/actions/auth";

export function AuthForm({ mode, next = "/" }: { mode: "login" | "register"; next?: string }) {
  const isLogin = mode === "login";
  const [state, action] = useActionState(isLogin ? loginAction : registerAction, null);
  const other = isLogin ? "/register" : "/login";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <h1 className="text-3xl font-extrabold uppercase italic leading-none">{isLogin ? "Entrar" : "Criar conta"}</h1>
      {!isLogin && <Field label="Nome" name="name" autoComplete="name" required />}
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        minLength={isLogin ? undefined : 6}
        required
      />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton size="lg" block>
        {isLogin ? "Entrar" : "Criar conta"}
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        {isLogin ? "Não tem conta? " : "Já tem conta? "}
        <Link href={next === "/" ? other : `${other}?callbackUrl=${encodeURIComponent(next)}`} className="font-medium text-accent">
          {isLogin ? "Criar conta" : "Entrar"}
        </Link>
      </p>
    </form>
  );
}
