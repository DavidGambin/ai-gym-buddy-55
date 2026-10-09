import { useSyncExternalStore } from "react";
import { EX_BY_ID, suggestForGroups, toMuscle, type Group, type Muscle } from "./exercises";

/**
 * Local persistence layer. Shape mirrors future DB tables:
 * profile, weekly_plan, routine_days, workouts, set_logs, ai_changes.
 */
export const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABEL: Record<Day, string> = { lunes: "Lunes", martes: "Martes", miercoles: "Miércoles", jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo" };
export const todayKey = (): Day => DAYS[(new Date().getDay() + 6) % 7];

export type SetT = { kg: number; reps: number };
export type RoutineEx = { exId: string; sets: SetT[] };
export type SetLog = { exId: string; kg: number; reps: number; ts: number; workoutId: string; effectiveKg?: number };
export type LiveSet = SetT & { done: boolean };
export type LiveExercise = { exId: string; sets: LiveSet[] };
export type ActiveWorkout = { day: Day; start: number; items: LiveExercise[] };
export type Workout = { id: string; day: Day; ts: number; durationSec: number; volume: number; exIds: string[]; photo?: string; note?: string };
export type AiChange = { ts: number; summary: string };
export type Profile = { weight: number; height: number; chest: number; waist: number; arm: number };

export type State = {
  loaded: boolean;
  onboarded: boolean;
  profile: Profile;
  plan: Record<Day, Group[]>;
  routine: Record<Day, RoutineEx[]>;
  workouts: Workout[];
  sets: SetLog[];
  aiChanges: AiChange[];
  snapshots: Record<Day, RoutineEx[]>[];
  recoveryHours: Partial<Record<Muscle, number>>;
  activeWorkout?: ActiveWorkout;
};

const DEFAULT_PLAN: Record<Day, Group[]> = {
  lunes: ["pecho", "hombro", "triceps"], martes: ["espalda", "biceps"], miercoles: ["pierna"],
  jueves: ["pecho", "espalda"], viernes: ["brazo", "hombro"], sabado: [], domingo: [],
};
export const DEFAULT_RECOVERY: Record<Muscle, number> = {
  pecho: 24, hombros: 24, biceps: 20, triceps: 20, antebrazos: 16, abdomen: 16, trapecio: 24,
  dorsal: 24, lumbar: 30, gluteos: 30, cuadriceps: 30, isquios: 30, gemelos: 18,
};

export const defaultSets = (): SetT[] => [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }, { kg: 20, reps: 10 }];
export const buildDay = (groups: Group[]): RoutineEx[] => suggestForGroups(groups).map((exId) => ({ exId, sets: defaultSets() }));
const emptyRoutine = () => Object.fromEntries(DAYS.map((d) => [d, []])) as unknown as Record<Day, RoutineEx[]>;

/** Estado inicial de una cuenta nueva: sin entrenos, sin récords. */
function fresh(): State {
  return { loaded: true, onboarded: false, profile: { weight: 75, height: 178, chest: 100, waist: 82, arm: 35 }, plan: DEFAULT_PLAN, routine: emptyRoutine(), workouts: [], sets: [], aiChanges: [], snapshots: [], recoveryHours: {} };
}

const SERVER: State = { ...fresh(), loaded: false };
let state: State = SERVER;
let userId: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

async function persist() {
  if (!userId) return;
  const { supabase } = await import("@/integrations/supabase/client");
  const { loaded: _l, snapshots: _s, ...data } = state;
  const { error } = await supabase.from("user_data").upsert({ user_id: userId, data: data as never, updated_at: new Date().toISOString() });
  if (error) console.error("No se pudo guardar", error);
}
function schedulePersist() { clearTimeout(saveTimer); saveTimer = setTimeout(persist, 600); }

/** Carga los datos de la cuenta desde la base de datos. */
export async function loadUser(id: string) {
  if (userId === id && state.loaded) return;
  userId = id; state = SERVER; emit();
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.from("user_data").select("data").eq("user_id", id).maybeSingle();
  if (userId !== id) return;
  if (error) console.error(error);
  state = { ...fresh(), ...((data?.data as Partial<State>) ?? {}), snapshots: [], loaded: true };
  if (!data) void persist();
  emit();
}
export function clearUser() { clearTimeout(saveTimer); userId = null; state = SERVER; emit(); }

export function setState(fn: (s: State) => Partial<State>) {
  state = { ...state, ...fn(state) };
  schedulePersist();
  emit();
}
export function getState() { return state; }
/** Entered dumbbell kg is per dumbbell; bodyweight loads use today's profile. */
export function effectiveLoad(exId: string, kg: number, bodyWeight: number) {
  const eq = EX_BY_ID[exId]?.eq;
  if (eq === "body weight") return Math.max(0, bodyWeight);
  return Math.max(0, kg) * (eq === "dumbbell" ? 2 : 1);
}
export function formatDuration(seconds: number) {
  const sec = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}
export function updateWorkout(id: string, patch: Partial<Workout>) {
  setState((s) => {
    const original = s.workouts.find((w) => w.id === id);
    if (!original) return {};
    const ts = patch.ts;
    if (ts !== undefined && (!Number.isFinite(ts) || ts > Date.now())) return {};
    return {
      workouts: s.workouts.map((w) => w.id === id ? { ...w, ...patch } : w),
      sets: ts === undefined ? s.sets : s.sets.map((l) => l.workoutId === id ? { ...l, ts: l.ts + ts - original.ts } : l),
    };
  });
}
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => sel(state),
    () => sel(SERVER),
  );
}

/* ---------- Routine mutations (snapshot for undo) ---------- */
export function mutateRoutine(fn: (r: Record<Day, RoutineEx[]>) => Record<Day, RoutineEx[]>, aiSummary?: string) {
  setState((s) => ({
    snapshots: aiSummary ? [...s.snapshots, s.routine].slice(-20) : s.snapshots,
    routine: fn(structuredClone(s.routine)),
    aiChanges: aiSummary ? [...s.aiChanges, { ts: Date.now(), summary: aiSummary }] : s.aiChanges,
  }));
}
export function undoAi() {
  setState((s) => s.snapshots.length ? { routine: s.snapshots[s.snapshots.length - 1], snapshots: s.snapshots.slice(0, -1), aiChanges: [...s.aiChanges, { ts: Date.now(), summary: "Deshacer" }] } : {});
}

export function resetAll() { setState(() => fresh()); }

/* ---------- Fatigue ---------- */
export function computeFatigue(s: State, at = Date.now()): Record<Muscle, number> {
  const f = {} as Record<Muscle, number>;
  for (const l of s.sets) {
    const e = EX_BY_ID[l.exId]; if (!e) continue;
    const h = (at - l.ts) / 3600e3; if (h < 0 || h > 120) continue;
    const add = (m: Muscle | undefined, w: number) => {
      if (!m) return; const k = s.recoveryHours[m] ?? DEFAULT_RECOVERY[m];
      f[m] = (f[m] ?? 0) + w * Math.exp(-h / k);
    };
    const main = toMuscle(e.t); add(main, 1);
    new Set(e.s.map(toMuscle).filter((m) => m && m !== main)).forEach((m) => add(m, 0.5));
  }
  return f;
}
export type Level = "high" | "mid" | "low" | undefined;
export const levelOf = (v = 0): Level => (v > 2 ? "high" : v > 1 ? "mid" : v > 0.3 ? "low" : undefined);

export function bestKg(s: State, exId: string, beforeTs = Infinity) {
  return s.sets.filter((l) => l.exId === exId && l.ts < beforeTs).reduce((m, l) => Math.max(m, l.kg), 0);
}
export const fmt = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
