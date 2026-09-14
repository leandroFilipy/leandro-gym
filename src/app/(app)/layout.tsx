import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { requireUserId } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUserId();
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] md:px-8 md:pb-10 md:pt-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
