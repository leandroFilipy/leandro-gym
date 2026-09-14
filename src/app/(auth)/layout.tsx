export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent text-lg font-extrabold text-accent-fg">LG</span>
        <div>
          <div className="text-xl font-bold">Leandro Gym</div>
          <div className="text-sm text-muted">Treino, dieta e evolução</div>
        </div>
      </div>
      {children}
    </main>
  );
}
