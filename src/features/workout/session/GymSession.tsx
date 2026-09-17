"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { CloudOff, Flag, Pause, Play, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { totalVolume } from "@/lib/domain/volume";
import { deleteSet, submitSet } from "@/lib/offline/outbox";
import { addExerciseToSessionAction, pauseSessionAction, resumeSessionAction } from "@/server/actions/sessions";
import type { GymExercise, GymSessionData } from "@/server/services/workouts";
import { fmtRepRange } from "../format";
import { ExercisePickerSheet, type LibraryExercise } from "./AddExerciseSheet";
import { primeAudio, requestNotificationPermission } from "./alerts";
import { Elapsed } from "./Elapsed";
import { ExerciseChips } from "./ExerciseChips";
import { FinishSheet } from "./FinishSheet";
import { useOutboxPending, useWakeLock } from "./hooks";
import { ReadinessCheck } from "./ReadinessCheck";
import { RecordToast, type RecordToastData } from "./RecordToast";
import { RestView, type RestState } from "./RestView";
import { SetLogger, type Draft } from "./SetLogger";

interface Props {
  session: GymSessionData;
  library: LibraryExercise[];
}

// ───────────── Regras de pré-preenchimento ─────────────

/** Última série de hoje > sugestão de progressão > primeira série do último treino. */
function defaultsFor(ex: GymExercise | undefined): Draft {
  if (!ex) return { weight: 0, reps: 10, rir: null };
  const last = ex.sets.at(-1);
  if (last) return { weight: last.weight, reps: last.repetitions, rir: null };
  if (ex.suggestion.weight !== null) return { weight: ex.suggestion.weight, reps: ex.suggestion.reps, rir: null };
  const prev = ex.previous?.sets[0];
  if (prev) return { weight: prev.weight, reps: prev.repetitions, rir: null };
  return { weight: 0, reps: ex.repMax, rir: null };
}

const isDone = (e: GymExercise) => e.sets.length >= e.plannedSets;
const allSetsCount = (list: GymExercise[]) => list.reduce((n, e) => n + e.sets.length, 0);

const READINESS_TONE = { low: "text-warn", normal: "text-muted", high: "text-success" } as const;

function firstIncomplete(list: GymExercise[]): number {
  const i = list.findIndex((e) => !isDone(e));
  return i === -1 ? 0 : i;
}

function nextIncomplete(list: GymExercise[], from: number): number | null {
  for (let k = 1; k <= list.length; k++) {
    const i = (from + k) % list.length;
    if (!isDone(list[i])) return i;
  }
  return null;
}

// ───────────── Componente ─────────────

export function GymSession({ session, library }: Props) {
  const router = useRouter();
  const [exercises, setExercises] = useState(session.exercises);
  const [idx, setIdx] = useState(() => firstIncomplete(session.exercises));
  const [draft, setDraft] = useState<Draft>(() => defaultsFor(session.exercises[firstIncomplete(session.exercises)]));
  const [rest, setRest] = useState<RestState | null>(null);
  const [record, setRecord] = useState<RecordToastData | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const pending = useOutboxPending();
  useWakeLock(true);

  // Pausa: guardamos localmente para a UI reagir na hora; o servidor consolida os segundos.
  const [pausedAt, setPausedAt] = useState<string | null>(session.pausedAt);
  const [pausePending, startPause] = useTransition();
  const paused = pausedAt != null;

  const togglePause = () =>
    startPause(async () => {
      if (paused) {
        const r = await resumeSessionAction(session.id);
        if (r.ok) setPausedAt(null);
      } else {
        const now = new Date().toISOString();
        const r = await pauseSessionAction(session.id);
        if (r.ok) setPausedAt(now);
      }
    });

  // Exercício adicionado no servidor (router.refresh) → incorpora sem perder o estado local.
  const [seenIds, setSeenIds] = useState(() => session.exercises.map((e) => e.id).join());
  const incomingIds = session.exercises.map((e) => e.id).join();
  if (incomingIds !== seenIds) {
    setSeenIds(incomingIds);
    const added = session.exercises.filter((n) => !exercises.some((p) => p.id === n.id));
    if (added.length) {
      setExercises([...exercises, ...added]);
      setIdx(exercises.length);
      setDraft(defaultsFor(added[0]));
    }
  }

  const askReadiness = session.readiness.ask && allSetsCount(exercises) === 0;
  const current = exercises[idx];
  const allSets = exercises.flatMap((e) => e.sets);
  const allDone = exercises.length > 0 && exercises.every(isDone);

  const select = (i: number) => {
    setIdx(i);
    setDraft(defaultsFor(exercises[i]));
    setRest(null);
  };

  async function completeSet() {
    if (!current) return;
    primeAudio();
    requestNotificationPermission();

    const set = {
      id: crypto.randomUUID(),
      setNumber: Math.max(0, ...current.sets.map((s) => s.setNumber)) + 1,
      weight: draft.weight,
      repetitions: draft.reps,
      rir: draft.rir,
    };
    const updated = exercises.map((e, i) => (i === idx ? { ...e, sets: [...e.sets, set] } : e));
    const ex = updated[idx];

    // Próximo alvo: mesma carga/reps no mesmo exercício, ou o próximo exercício pendente.
    const nextIdx = isDone(ex) ? (nextIncomplete(updated, idx) ?? idx) : idx;
    const nextEx = updated[nextIdx];
    const nextDraft = nextIdx === idx ? { ...draft, rir: null } : defaultsFor(nextEx);
    const finished = updated.every(isDone);

    setExercises(updated);
    setIdx(nextIdx);
    setDraft(nextDraft);
    if (!finished && ex.restSeconds > 0) {
      setRest({
        endAt: Date.now() + ex.restSeconds * 1000,
        total: ex.restSeconds,
        next: {
          name: nextEx.name,
          weight: nextDraft.weight,
          reps: nextDraft.reps,
          range: fmtRepRange(nextEx.repMin, nextEx.repMax),
          setLabel: `Série ${nextEx.sets.length + 1}`,
        },
      });
    }

    const res = await submitSet({ ...set, workoutExerciseId: ex.id });
    if (res?.record) setRecord({ exercise: ex.name, ...res.record });
  }

  function removeSet(setId: string) {
    setExercises((list) => list.map((e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) })));
    void deleteSet(setId);
  }

  const addRest = (seconds: number) => setRest((r) => (r ? { ...r, endAt: r.endAt + seconds * 1000, total: r.total + seconds } : r));
  const endRest = useCallback(() => setRest(null), []);
  const closeRecord = useCallback(() => setRecord(null), []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      {/* Cabeçalho mínimo */}
      <header className="flex items-center gap-2 py-2">
        <Link href="/treino" aria-label="Sair do modo academia" className="-ml-2 rounded-full p-2 text-muted hover:bg-surface-2">
          <X className="size-6" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-bold uppercase italic leading-tight">{session.name}</div>
          <div className="text-xs text-muted">
            <Elapsed since={session.startedAt} pausedSeconds={session.pausedSeconds} pausedAt={pausedAt} />
            {" · "}{allSets.length} séries
            {session.readiness.level && session.readiness.score !== null && (
              <span className={`ml-2 font-semibold ${READINESS_TONE[session.readiness.level]}`}>prontidão {session.readiness.score}</span>
            )}
            {paused &&<span className="ml-2 font-semibold text-warn">⏸ pausado</span>}
            {pending > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-warn">
                <CloudOff className="size-3" /> {pending} pendente(s)
              </span>
            )}
          </div>
        </div>
        <Button variant={paused ? "primary" : "secondary"} size="sm" disabled={pausePending} onClick={togglePause}>
          {paused ? <><Play className="size-4" /> Retomar</> : <><Pause className="size-4" /> Pausar</>}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setFinishOpen(true)}>
          <Flag className="size-4" /> Finalizar
        </Button>
      </header>

      {exercises.length > 0 && (
        <div className="py-2">
          <ExerciseChips exercises={exercises} current={idx} onSelect={select} />
        </div>
      )}

      <div className="flex flex-1 flex-col pb-40 pt-2">
        {askReadiness ? (
          <ReadinessCheck sessionId={session.id} />
        ) : paused ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div className="grid size-20 place-items-center rounded-full border border-warn/40 bg-warn/10 text-warn">
              <Pause className="size-9" />
            </div>
            <div>
              <div className="font-display text-xl font-bold uppercase italic">Treino pausado</div>
              <p className="mt-1 text-sm text-muted">O cronômetro está parado. Retome quando voltar.</p>
            </div>
            <Button size="lg" disabled={pausePending} onClick={togglePause}>
              <Play className="size-5" /> Retomar treino
            </Button>
          </div>
        ) : rest ? (
          <RestView
            rest={rest}
            sound={session.settings.soundEnabled}
            vibration={session.settings.vibrationEnabled}
            onAdd={addRest}
            onDone={endRest}
          />
        ) : !current ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted">Nenhum exercício neste treino.</p>
            <Button size="lg" onClick={() => setPickerOpen(true)}>
              <Plus className="size-5" /> Adicionar exercício
            </Button>
          </div>
        ) : (
          <>
            {allDone && (
              <div className="mb-4 rounded-2xl border border-success/30 bg-success/10 p-3 text-center text-sm text-success">
                ✅ Todas as séries planejadas feitas! Finalize ou faça séries extras.
              </div>
            )}
            <SetLogger
              key={current.id}
              exercise={current}
              draft={draft}
              onDraft={setDraft}
              weightStep={session.settings.weightStepKg}
              onRemoveSet={removeSet}
            />
            <button type="button" onClick={() => setPickerOpen(true)} className="mt-6 self-center text-sm text-muted underline-offset-4 hover:underline">
              + adicionar exercício ao treino
            </button>
          </>
        )}
      </div>

      {/* Ação principal fixa na zona do polegar */}
      {!askReadiness && !rest && !paused && current && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur">
          <div className="mx-auto max-w-lg pb-3">
            <Button size="xl" block onClick={completeSet}>
              CONCLUIR SÉRIE
            </Button>
          </div>
        </div>
      )}

      {record && <RecordToast record={record} onClose={closeRecord} />}

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        library={library}
        exclude={exercises.map((e) => e.exerciseId)}
        onPick={async (exerciseId) => {
          await addExerciseToSessionAction(session.id, exerciseId);
          router.refresh();
        }}
      />

      <FinishSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        sessionId={session.id}
        setCount={allSets.length}
        volume={totalVolume(allSets)}
        pending={pending}
        missing={exercises.reduce((n, e) => n + Math.max(0, e.plannedSets - e.sets.length), 0)}
      />
    </div>
  );
}
