import { NextResponse } from "next/server";
import { db } from "@/server/db";

// ROTA TEMPORÁRIA DE DIAGNÓSTICO — remover depois. Não expõe dados sensíveis.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WD = ["", "seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("k") !== "diag-2026") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Fuso Brasil; ISO weekday (1=seg..7=dom)
  const now = new Date();
  const isoWeekday = ((now.getUTCDay() + 6) % 7) + 1;

  const users = await db.user.findMany({ select: { id: true, email: true } });
  const out = [];
  for (const u of users) {
    const plan = await db.workoutPlan.findFirst({
      where: { userId: u.id, active: true },
      include: { days: { include: { _count: { select: { exercises: true } } } } },
    });
    out.push({
      email: u.email,
      hasActivePlan: !!plan,
      planName: plan?.name ?? null,
      days: plan?.days.map((d) => ({ weekday: WD[d.weekday], name: d.name, type: d.type, exercicios: d._count.exercises })) ?? [],
      hojeIso: WD[isoWeekday],
    });
  }

  return NextResponse.json({ isoWeekday, out }, { headers: { "Cache-Control": "no-store" } });
}
