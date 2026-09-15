"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActive, NAV_ITEMS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line/70 bg-bg/65 p-4 backdrop-blur-xl md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2">
        <img src="/icons/icon-192.png" alt="" className="size-9 rounded-lg border border-line object-cover" />
        <span className="font-semibold tracking-tight">Leandro Gym</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                active ? "border-accent/20 bg-accent/8 text-accent" : "border-transparent text-muted hover:border-line hover:bg-surface hover:text-fg",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
