import { Dumbbell, Home, LineChart, User, UtensilsCrossed } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/treino", label: "Treino", icon: Dumbbell },
  { href: "/dieta", label: "Dieta", icon: UtensilsCrossed },
  { href: "/progresso", label: "Progresso", icon: LineChart },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
