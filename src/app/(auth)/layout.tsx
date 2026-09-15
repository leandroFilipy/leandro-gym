import { Wordmark } from "@/components/layout/Wordmark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="hazard fixed inset-x-0 top-0 h-1.5 opacity-80" aria-hidden />
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
        <div className="mb-10">
          <Wordmark size="lg" />
          <div className="eyebrow mt-3 text-muted">Treino · Dieta · Evolução</div>
        </div>
        {children}
      </main>
    </>
  );
}
