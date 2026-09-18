import { Dumbbell, Home, LineChart, PersonStanding, User, UtensilsCrossed } from "lucide-react";

/** Barra de baixo (celular): 5 abas. O Perfil fica num ícone no topo da Home. */
export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/treino", label: "Treino", icon: Dumbbell },
  { href: "/dieta", label: "Dieta", icon: UtensilsCrossed },
  { href: "/corpo", label: "Corpo", icon: PersonStanding },
  { href: "/progresso", label: "Progresso", icon: LineChart },
] as const;

/** Barra lateral (computador) tem espaço para o Perfil também. */
export const SIDEBAR_ITEMS = [...NAV_ITEMS, { href: "/perfil", label: "Perfil", icon: User }] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
