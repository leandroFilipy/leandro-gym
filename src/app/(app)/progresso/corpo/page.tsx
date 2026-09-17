import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, EmptyState } from "@/components/ui/Card";
import { BodyFatCard } from "@/features/body/BodyFatCard";
import { DeleteBodyItemButton } from "@/features/body/DeleteBodyItemButton";
import { navySeries } from "@/lib/domain/body-fat";
import { MeasurementChart } from "@/features/body/MeasurementChart";
import { MeasurementForm } from "@/features/body/MeasurementForm";
import { PhotoCompareControls } from "@/features/body/PhotoCompareControls";
import { PhotoUploader } from "@/features/body/PhotoUploader";
import { cn } from "@/lib/cn";
import { daysBetween, todayIn } from "@/lib/dates";
import { MEASUREMENT_FIELDS, measurementDeltas, waistToHip, type MeasurementValues } from "@/lib/domain/measurements";
import { fmtDayMonth, fmtFullDate, fmtNumber, fmtSigned } from "@/lib/format";
import { MEASUREMENT_GOOD_DIRECTION, MEASUREMENT_LABEL, MEASUREMENT_UNIT, POSE_LABEL, POSES } from "@/lib/labels";
import { getSettings, requireUserId } from "@/server/session";
import { getBodyPhoto, getMeasurements, listBodyPhotos } from "@/server/services/body";
import type { PhotoPose } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Medidas e fotos" };

function changeTone(field: (typeof MEASUREMENT_FIELDS)[number], change: number) {
  const good = MEASUREMENT_GOOD_DIRECTION[field];
  if (!good || change === 0) return "text-muted";
  return (change < 0) === (good === "down") ? "text-success" : "text-warn";
}

export default async function BodyPage({ searchParams }: PageProps<"/progresso/corpo">) {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const sp = await searchParams;

  const [entries, photos] = await Promise.all([getMeasurements(userId), listBodyPhotos(userId)]);

  // ── Medidas
  const deltas = measurementDeltas(entries);
  const latest: MeasurementValues = Object.fromEntries(deltas.map((d) => [d.field, d.latest]));
  const byDate = Object.fromEntries(entries.map((e) => [e.date, e]));
  const whr = waistToHip(latest);
  const recentEntries = [...entries].reverse().slice(0, 10);
  const usedFields = MEASUREMENT_FIELDS.filter((f) => entries.some((e) => typeof e[f] === "number"));
  const bodyFat = settings.sex && settings.heightCm ? navySeries(entries, settings.sex, settings.heightCm) : [];

  // ── Fotos: pose e datas para comparar (padrão: primeira × última)
  const datesByPose = Object.fromEntries(POSES.map((p) => [p, photos.filter((x) => x.pose === p).map((x) => x.date)])) as Record<PhotoPose, string[]>;
  const poseParam = typeof sp.pose === "string" && (POSES as string[]).includes(sp.pose) ? (sp.pose as PhotoPose) : null;
  const pose = poseParam ?? POSES.find((p) => datesByPose[p].length > 0) ?? "FRONT";
  const dates = datesByPose[pose];
  const pickDate = (v: unknown, fallback: string | undefined) => (typeof v === "string" && dates.includes(v) ? v : (fallback ?? null));
  const a = pickDate(sp.a, dates.at(-1));
  const b = pickDate(sp.b, dates[0]);
  const [photoA, photoB] = await Promise.all([
    a ? getBodyPhoto(userId, a, pose) : null,
    b && b !== a ? getBodyPhoto(userId, b, pose) : null,
  ]);

  const gallery = [...new Set(photos.map((p) => p.date))].map((date) => ({ date, items: photos.filter((p) => p.date === date) }));

  return (
    <>
      <PageHeader title="Corpo" subtitle="Medidas e fotos de progresso" back="/progresso" />
      <div className="flex flex-col gap-4">
        {deltas.length > 0 && (
          <Card>
            <CardHeader title="Evolução das medidas" />
            <ul className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              {deltas.map((d) => (
                <li key={d.field} className="min-w-0">
                  <div className="font-display text-xs font-bold uppercase tracking-[0.14em] text-muted">{MEASUREMENT_LABEL[d.field]}</div>
                  <div className="tabular font-display text-2xl font-bold italic leading-tight">
                    {fmtNumber(d.latest)}
                    <span className="ml-0.5 text-sm font-normal not-italic text-muted">{MEASUREMENT_UNIT[d.field]}</span>
                  </div>
                  {d.firstDate !== d.latestDate ? (
                    <div className="text-xs text-muted">
                      <span className={cn("tabular font-semibold", changeTone(d.field, d.change))}>{fmtSigned(d.change)}</span> desde {fmtDayMonth(d.firstDate)}
                    </div>
                  ) : (
                    <div className="text-xs text-faint">{fmtDayMonth(d.latestDate)}</div>
                  )}
                </li>
              ))}
            </ul>
            {whr !== null && (
              <p className="mt-3 text-xs text-muted">
                Relação cintura/quadril: <span className="tabular text-fg">{fmtNumber(whr)}</span>
              </p>
            )}
          </Card>
        )}

        <BodyFatCard series={bodyFat} sex={settings.sex} heightCm={settings.heightCm} />

        <Card>
          <CardHeader title="Registrar medidas" />
          <MeasurementForm today={today} byDate={byDate} latest={latest} />
        </Card>

        {usedFields.length > 0 && <MeasurementChart entries={entries} fields={usedFields} />}

        {recentEntries.length > 0 && (
          <Card className="p-0">
            <div className="p-4 pb-0">
              <CardHeader title="Registros" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-4 py-2 font-normal">Data</th>
                    {usedFields.map((f) => (
                      <th key={f} className="whitespace-nowrap px-2 py-2 text-right font-normal">
                        {MEASUREMENT_LABEL[f]}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recentEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-4 py-2 text-muted">{fmtDayMonth(e.date)}</td>
                      {usedFields.map((f) => (
                        <td key={f} className="tabular px-2 py-2 text-right">
                          {typeof e[f] === "number" ? fmtNumber(e[f]) : "—"}
                        </td>
                      ))}
                      <td className="pr-2 text-right">
                        <DeleteBodyItemButton kind="measurement" id={e.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="Nova foto" />
          <PhotoUploader today={today} />
        </Card>

        {photos.length === 0 ? (
          <EmptyState title="Sem fotos ainda" text="Tire fotos de frente, lado e costas a cada 2–4 semanas. A balança não mostra recomposição; a foto mostra." />
        ) : (
          <>
            <Card id="comparar" className="scroll-mt-4">
              <CardHeader title="Comparar" />
              <PhotoCompareControls pose={pose} a={a} b={b} datesByPose={datesByPose} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[photoA, photoB].map((p, i) => (
                  <figure key={i} className="min-w-0">
                    <div className="aspect-[3/4] overflow-hidden rounded-md border border-line bg-surface-2">
                      {p ? (
                        // eslint-disable-next-line @next/next/no-img-element -- data URL, sem otimização do next/image
                        <img src={p.imageUrl} alt={`${POSE_LABEL[p.pose]} em ${fmtFullDate(p.date)}`} className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center p-2 text-center text-xs text-faint">
                          {i === 1 ? "Escolha outra data para comparar" : "—"}
                        </div>
                      )}
                    </div>
                    {p && (
                      <figcaption className="mt-1 text-center text-xs text-muted">
                        {i === 0 ? "Antes" : "Depois"} · {fmtFullDate(p.date)}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
              {photoA && photoB && a && b && a !== b && (
                <p className="mt-2 text-center text-xs text-muted">{Math.abs(daysBetween(a, b))} dias de diferença</p>
              )}
            </Card>

            <Card>
              <CardHeader title="Galeria" />
              <ul className="flex flex-col gap-4">
                {gallery.map((g) => (
                  <li key={g.date}>
                    <div className="mb-1.5 text-sm font-semibold">{fmtFullDate(g.date)}</div>
                    <div className="grid grid-cols-3 gap-2">
                      {g.items.map((p) => (
                        <div key={p.id} className="relative">
                          <Link href={`/progresso/corpo?pose=${p.pose}&b=${p.date}#comparar`} scroll={false} className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura em data URL */}
                            <img src={p.thumbUrl} alt={`${POSE_LABEL[p.pose]} em ${fmtFullDate(p.date)}`} className="aspect-[3/4] w-full rounded-md border border-line object-cover" />
                            <span className="absolute bottom-1 left-1 rounded-sm bg-black/70 px-1.5 py-0.5 text-[11px]">{POSE_LABEL[p.pose]}</span>
                          </Link>
                          <DeleteBodyItemButton kind="photo" id={p.id} className="absolute right-1 top-1 bg-black/60" />
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
