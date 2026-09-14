import { requireUserId } from "@/server/session";

// Modo academia: sem navegação, foco total no exercício atual.
export default async function FocusLayout({ children }: LayoutProps<"/">) {
  await requireUserId();
  return <main className="min-h-dvh">{children}</main>;
}
