"use client";

import { useActionState } from "react";
import { Field, FormError, SelectField, SubmitButton, Toggle } from "@/components/ui/Field";
import { saveSettingsAction } from "@/server/actions/settings";

export interface SettingsValues {
  defaultRestSeconds: number;
  weightStepKg: number;
  weightIncrementKg: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  tdeeKcal: number | null;
  heightCm: number | null;
  sex: "MALE" | "FEMALE" | null;
  birthDate: string | null; // YYYY-MM-DD
  activityLevel: "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE";
  dietGoal: "LOSE" | "MAINTAIN" | "GAIN";
  autoNutritionGoal: boolean;
  carbCyclingEnabled: boolean;
  restDayCarbsCut: number;
  mealRemindersEnabled: boolean;
  waterRemindersEnabled: boolean;
  waterGoalMl: number | null;
  timezone: string;
  dailyEmailEnabled: boolean;
  dailyEmailTime: string;
  weeklyReportEnabled: boolean;
}

/** Horas com cron agendado (vercel.json: /api/cron/daily-email/05 … /22). */
const REMINDER_HOURS = Array.from({ length: 18 }, (_, i) => `${String(i + 5).padStart(2, "0")}:00`);

/** Valor salvo antigo (ex.: "07:30" ou "03:00") → hora cheia disponível mais próxima. */
function reminderHour(value: string) {
  const h = Math.min(22, Math.max(5, Number(value.slice(0, 2)) || 7));
  return `${String(h).padStart(2, "0")}:00`;
}

const TIMEZONES = ["America/Sao_Paulo", "America/Manaus", "America/Belem", "America/Fortaleza", "America/Recife", "America/Cuiaba", "America/Rio_Branco", "America/Noronha", "Europe/Lisbon"];

const ACTIVITY_LABEL: Record<SettingsValues["activityLevel"], string> = {
  SEDENTARY: "Sedentário (pouco ou nenhum exercício)",
  LIGHT: "Leve (1–3x/semana)",
  MODERATE: "Moderado (3–5x/semana)",
  ACTIVE: "Ativo (6–7x/semana)",
  VERY_ACTIVE: "Muito ativo (intenso / trabalho físico)",
};

const GOAL_LABEL: Record<SettingsValues["dietGoal"], string> = {
  LOSE: "Perder gordura (déficit)",
  MAINTAIN: "Manter o peso",
  GAIN: "Ganhar massa (superávit)",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</legend>
      {children}
    </fieldset>
  );
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action] = useActionState(saveSettingsAction, null);
  const zones = TIMEZONES.includes(values.timezone) ? TIMEZONES : [values.timezone, ...TIMEZONES];

  return (
    <form action={action} className="flex flex-col gap-6">
      <Section title="Treino">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Descanso padrão (s)" name="defaultRestSeconds" type="number" inputMode="numeric" defaultValue={values.defaultRestSeconds} />
          <Field label="Passo +/− (kg)" name="weightStepKg" type="number" step="any" inputMode="decimal" defaultValue={values.weightStepKg} />
          <Field label="Aumento sugerido (kg)" name="weightIncrementKg" type="number" step="any" inputMode="decimal" defaultValue={values.weightIncrementKg} />
        </div>
        <Toggle label="Som ao fim do descanso" name="soundEnabled" defaultChecked={values.soundEnabled} />
        <Toggle label="Vibrar ao fim do descanso" name="vibrationEnabled" defaultChecked={values.vibrationEnabled} />
      </Section>

      <Section title="Energia">
        <Field
          label="Gasto energético diário estimado — TDEE (kcal)"
          hint="opcional"
          name="tdeeKcal"
          type="number"
          inputMode="numeric"
          defaultValue={values.tdeeKcal ?? ""}
          placeholder="Ex.: 2800"
        />
        <p className="-mt-1 text-xs text-muted">Usado só para estimar déficit/superávit. É uma estimativa, não um valor exato.</p>
      </Section>

      <Section title="Perfil nutricional">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Altura (cm)" name="heightCm" type="number" inputMode="numeric" defaultValue={values.heightCm ?? ""} placeholder="Ex.: 178" />
          <Field label="Data de nascimento" name="birthDate" type="date" defaultValue={values.birthDate ?? ""} />
          <SelectField label="Sexo" name="sex" defaultValue={values.sex ?? ""}>
            <option value="">—</option>
            <option value="MALE">Masculino</option>
            <option value="FEMALE">Feminino</option>
          </SelectField>
          <SelectField label="Objetivo" name="dietGoal" defaultValue={values.dietGoal}>
            {(Object.keys(GOAL_LABEL) as SettingsValues["dietGoal"][]).map((g) => (
              <option key={g} value={g}>
                {GOAL_LABEL[g]}
              </option>
            ))}
          </SelectField>
        </div>
        <SelectField label="Nível de atividade" name="activityLevel" defaultValue={values.activityLevel}>
          {(Object.keys(ACTIVITY_LABEL) as SettingsValues["activityLevel"][]).map((a) => (
            <option key={a} value={a}>
              {ACTIVITY_LABEL[a]}
            </option>
          ))}
        </SelectField>
        <Toggle
          label="Calcular minhas metas automaticamente"
          description="Recalcula calorias, proteína, carboidrato e gordura ao registrar um novo peso"
          name="autoNutritionGoal"
          defaultChecked={values.autoNutritionGoal}
        />
        <p className="-mt-1 text-xs text-muted">
          Precisa de altura, sexo e data de nascimento preenchidos. Usa a fórmula de Mifflin-St Jeor com base no seu peso mais recente.
        </p>
        <Toggle
          label="Meta diferente em dia de treino e de descanso"
          description="Menos carboidrato no descanso; o que sobra vai para os dias de treino (a média da semana não muda)"
          name="carbCyclingEnabled"
          defaultChecked={values.carbCyclingEnabled}
        />
        <Field
          label="Carboidrato a menos no dia de descanso (g)"
          name="restDayCarbsCut"
          type="number"
          inputMode="numeric"
          min={0}
          max={300}
          defaultValue={values.restDayCarbsCut}
        />
        <p className="-mt-1 text-xs text-muted">Usa os dias de treino da ficha ativa. Se você treinar num dia de descanso, o dia vira de treino.</p>
      </Section>

      <Section title="Lembretes e relatórios">
        <Toggle label="E-mail com o treino do dia" description="Requer e-mail configurado no servidor" name="dailyEmailEnabled" defaultChecked={values.dailyEmailEnabled} />
        <SelectField label="Horário do lembrete do treino (e-mail e push)" name="dailyEmailTime" defaultValue={reminderHour(values.dailyEmailTime)}>
          {REMINDER_HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </SelectField>
        <p className="-mt-1 text-xs text-muted">Chega dentro dessa hora (ex.: 07:00 → entre 7h e 7h59).</p>
        <Toggle label="Relatório semanal por e-mail (domingo)" name="weeklyReportEnabled" defaultChecked={values.weeklyReportEnabled} />
        <Toggle
          label="Lembrete de registrar refeições"
          description="Notificação push ~13h30 se o almoço estiver vazio e ~21h se o jantar estiver vazio (requer push ativado)"
          name="mealRemindersEnabled"
          defaultChecked={values.mealRemindersEnabled}
        />
        <Toggle
          label="Lembrete de beber água"
          description="Notificação push ~13h30 e ~21h se você estiver bem abaixo do esperado para a hora (requer push ativado)"
          name="waterRemindersEnabled"
          defaultChecked={values.waterRemindersEnabled}
        />
        <Field
          label="Meta de água por dia (ml)"
          hint="vazio = automático, 35 ml por kg"
          name="waterGoalMl"
          type="number"
          inputMode="numeric"
          min={500}
          max={8000}
          step={50}
          defaultValue={values.waterGoalMl ?? ""}
          placeholder="Ex.: 3000"
        />
        <SelectField label="Fuso horário" name="timezone" defaultValue={values.timezone}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace("America/", "").replace("_", " ")}
            </option>
          ))}
        </SelectField>
      </Section>

      <FormError message={state && !state.ok ? state.error : null} />
      {state?.ok && <p className="text-sm text-success">✓ Configurações salvas</p>}
      <SubmitButton size="lg" block>
        Salvar configurações
      </SubmitButton>
    </form>
  );
}
