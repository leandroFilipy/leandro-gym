"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/Field";
import { requestPasswordResetAction, resetPasswordAction } from "@/server/actions/password";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold uppercase italic leading-none">Confira seu e-mail</h1>
        <p className="text-sm text-muted">
          Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Ele vale por 1 hora. Olhe também a caixa de spam.
        </p>
        <Link href="/login" className="text-center text-sm font-medium text-accent">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="text-3xl font-extrabold uppercase italic leading-none">Esqueci minha senha</h1>
      <p className="text-sm text-muted">Informe o e-mail da conta. Vamos mandar um link para você criar uma senha nova.</p>
      <Field label="E-mail" name="email" type="email" autoComplete="email" required />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton size="lg" block>
        Enviar link
      </SubmitButton>
      <Link href="/login" className="text-center text-sm text-muted">
        Voltar para o login
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  // Sucesso redireciona para /login?senha=redefinida.
  const [state, action] = useActionState(resetPasswordAction, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <h1 className="text-3xl font-extrabold uppercase italic leading-none">Nova senha</h1>
      <Field label="Nova senha" name="password" type="password" autoComplete="new-password" minLength={6} required />
      <Field label="Repita a nova senha" name="confirm" type="password" autoComplete="new-password" minLength={6} required />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton size="lg" block>
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
