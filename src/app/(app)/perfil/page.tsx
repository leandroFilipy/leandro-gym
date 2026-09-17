import type { Metadata } from "next";
import Link from "next/link";
import { Bug, LogOut } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardHeader } from "@/components/ui/Card";
import { AccountDataCard } from "@/features/profile/AccountDataCard";
import { AutoGoalPreview } from "@/features/profile/AutoGoalPreview";
import { GoalForm } from "@/features/profile/GoalForm";
import { SettingsForm } from "@/features/profile/SettingsForm";
import { PushToggle } from "@/features/profile/PushToggle";
import { fromDbDate, todayIn } from "@/lib/dates";
import { ageFromBirthDate, computeNutritionGoalBreakdown, type NutritionGoalBreakdown } from "@/lib/domain/energy";
import { logoutAction } from "@/server/actions/auth";
import { db } from "@/server/db";
import { isAdmin } from "@/server/monitoring/errors";
import { countRecentErrors } from "@/server/services/errors";
import { getSettings, requireUserId } from "@/server/session";
import { getActiveGoal } from "@/server/services/nutrition";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const [user, goal, lastWeight, admin] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    getActiveGoal(userId, todayIn(settings.timezone)),
    db.bodyWeight.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { weightKg: true } }),
    isAdmin(userId),
  ]);
  const recentErrors = admin ? await countRecentErrors() : 0;

  // Prévia do cálculo automático (TMB → TDEE → meta).
  const missing: string[] = [];
  if (settings.heightCm == null) missing.push("altura");
  if (settings.sex == null) missing.push("sexo");
  if (settings.birthDate == null) missing.push("data de nascimento");
  if (!lastWeight) missing.push("peso");

  let breakdown: NutritionGoalBreakdown | null = null;
  if (missing.length === 0 && lastWeight && settings.heightCm != null && settings.sex != null && settings.birthDate != null) {
    breakdown = computeNutritionGoalBreakdown({
      weightKg: lastWeight.weightKg,
      heightCm: settings.heightCm,
      ageYears: ageFromBirthDate(settings.birthDate),
      sex: settings.sex,
      activityLevel: settings.activityLevel,
      dietGoal: settings.dietGoal,
    });
  }

  return (
    <>
      <PageHeader title="Perfil" subtitle={user?.email} />
      <div className="flex flex-col gap-4">
        {settings.autoNutritionGoal && (
          <Card>
            <AutoGoalPreview
              breakdown={breakdown}
              weightKg={lastWeight?.weightKg ?? null}
              activityLevel={settings.activityLevel}
              dietGoal={settings.dietGoal}
              missing={missing}
            />
          </Card>
        )}

        <Card>
          <CardHeader title="Metas diárias" />
          {settings.autoNutritionGoal ? (
            <p className="text-sm text-muted">
              As metas estão em <strong className="text-fg">modo automático</strong> e são recalculadas quando você registra um novo peso.
              Para editar manualmente, desligue &quot;Calcular metas automaticamente&quot; abaixo.
            </p>
          ) : (
            <GoalForm goal={goal} />
          )}
        </Card>

        <Card>
          <SettingsForm
            values={{
              defaultRestSeconds: settings.defaultRestSeconds,
              weightStepKg: settings.weightStepKg,
              weightIncrementKg: settings.weightIncrementKg,
              soundEnabled: settings.soundEnabled,
              vibrationEnabled: settings.vibrationEnabled,
              tdeeKcal: settings.tdeeKcal,
              heightCm: settings.heightCm,
              sex: settings.sex,
              birthDate: settings.birthDate ? fromDbDate(settings.birthDate) : null,
              activityLevel: settings.activityLevel,
              dietGoal: settings.dietGoal,
              autoNutritionGoal: settings.autoNutritionGoal,
              carbCyclingEnabled: settings.carbCyclingEnabled,
              restDayCarbsCut: settings.restDayCarbsCut,
              mealRemindersEnabled: settings.mealRemindersEnabled,
              timezone: settings.timezone,
              dailyEmailEnabled: settings.dailyEmailEnabled,
              dailyEmailTime: settings.dailyEmailTime,
              weeklyReportEnabled: settings.weeklyReportEnabled,
            }}
          />
        </Card>

        <Card>
          <CardHeader title="Notificações push" />
          <PushToggle initialEnabled={settings.pushEnabled} />
        </Card>

        <Card className="text-sm text-muted">
          <CardHeader title="Instalar no celular" />
          <p>
            <strong className="text-fg">Android (Chrome):</strong> menu ⋮ → &quot;Instalar app&quot;.
            <br />
            <strong className="text-fg">iPhone (Safari):</strong> compartilhar → &quot;Adicionar à Tela de Início&quot;.
          </p>
        </Card>

        {admin && (
          <Link href="/perfil/erros" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-accent">
            <Bug className="size-5 text-accent" />
            <span className="flex-1">
              <span className="block font-semibold">Erros do app</span>
              <span className="text-sm text-muted">{recentErrors === 0 ? "Nenhum nas últimas 24 h" : `${recentErrors} nas últimas 24 h`}</span>
            </span>
            {recentErrors > 0 && <Badge tone="danger">{recentErrors}</Badge>}
          </Link>
        )}

        <AccountDataCard />

        <form action={logoutAction}>
          <Button type="submit" variant="secondary" block>
            <LogOut className="size-4" /> Sair
          </Button>
        </form>
      </div>
    </>
  );
}
