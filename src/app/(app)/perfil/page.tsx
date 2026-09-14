import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { GoalForm } from "@/features/profile/GoalForm";
import { SettingsForm } from "@/features/profile/SettingsForm";
import { PushToggle } from "@/features/profile/PushToggle";
import { todayIn } from "@/lib/dates";
import { logoutAction } from "@/server/actions/auth";
import { db } from "@/server/db";
import { getSettings, requireUserId } from "@/server/session";
import { getActiveGoal } from "@/server/services/nutrition";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const [user, goal] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    getActiveGoal(userId, todayIn(settings.timezone)),
  ]);

  return (
    <>
      <PageHeader title="Perfil" subtitle={user?.email} />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader title="Metas diárias" />
          <GoalForm goal={goal} />
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

        <form action={logoutAction}>
          <Button type="submit" variant="secondary" block>
            <LogOut className="size-4" /> Sair
          </Button>
        </form>
      </div>
    </>
  );
}
