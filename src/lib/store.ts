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
export type SetLog = { exId: string; kg: number; reps: number; ts: number; workoutId: string };
export type Workout = { id: string; day: Day; ts: number; durationSec: number; volume: number; exIds: string[] };
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

function sample(): State {
  const routine = Object.fromEntries(DAYS.map((d) => [d, buildDay(DEFAULT_PLAN[d])])) as Record<Day, RoutineEx[]>;
  // Datos de ejemplo: entreno de ayer y de hace 3 días
  const now = Date.now();
  const sets: SetLog[] = [];
  const workouts: Workout[] = [];
  const mk = (day: Day, hoursAgo: number, base: number) => {
    const id = "w" + hoursAgo; const ts = now - hoursAgo * 3600e3; let vol = 0;
    routine[day].forEach((r, i) => r.sets.forEach(() => { const kg = base + i * 2; sets.push({ exId: r.exId, kg, reps: 10, ts, workoutId: id }); vol += kg * 10; }));
    workouts.push({ id, day, ts, durationSec: 3300, volume: vol, exIds: routine[day].map((r) => r.exId) });
  };
  mk("jueves", 120, 25); mk("martes", 72, 30); mk("lunes", 20, 35);
  return { loaded: true, onboarded: false, profile: { weight: 75, height: 178, chest: 100, waist: 82, arm: 35 }, plan: DEFAULT_PLAN, routine, workouts, sets, aiChanges: [], snapshots: [], recoveryHours: {} };
}

const KEY = "forma.v1";
const SERVER: State = { ...sample(), loaded: false, routine: emptyRoutine(), workouts: [], sets: [] };
let state: State = SERVER;
const subs = new Set<() => void>();

function init() {
  if (typeof window === "undefined" || state.loaded) return;
  try { const s = localStorage.getItem(KEY); state = s ? { ...sample(), ...JSON.parse(s), loaded: true } : sample(); } catch { state = sample(); }
}
export function setState(fn: (s: State) => Partial<State>) {
  init();
  state = { ...state, ...fn(state) };
  try { const { loaded: _l, ...rest } = state; localStorage.setItem(KEY, JSON.stringify(rest)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
export function getState() { init(); return state; }
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb); },
    () => sel(getState()),
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

export function resetAll() { localStorage.removeItem(KEY); state = sample(); subs.forEach((f) => f()); }

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
