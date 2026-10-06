import raw from "@/data/exercises.json";

export type Exercise = { id: string; n: string; t: string; s: string[]; eq: string; g: string; st: string[] };
export const EXERCISES = raw as Exercise[];
export const EX_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
export const gifUrl = (e: Exercise) => `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/${e.g}.gif`;

export type Muscle =
  | "pecho" | "hombros" | "biceps" | "triceps" | "antebrazos" | "abdomen" | "trapecio"
  | "dorsal" | "lumbar" | "gluteos" | "cuadriceps" | "isquios" | "gemelos";

export const MUSCLE_LABEL: Record<Muscle, string> = {
  pecho: "Pecho", hombros: "Hombros", biceps: "Bíceps", triceps: "Tríceps", antebrazos: "Antebrazos",
  abdomen: "Abdomen", trapecio: "Espalda alta", dorsal: "Dorsal", lumbar: "Lumbar", gluteos: "Glúteos",
  cuadriceps: "Cuádriceps", isquios: "Isquios", gemelos: "Gemelos",
};

const MAP: Record<string, Muscle> = {
  pectorals: "pecho", chest: "pecho", "upper chest": "pecho", delts: "hombros", shoulders: "hombros",
  "rear deltoids": "hombros", deltoids: "hombros", "rotator cuff": "hombros", biceps: "biceps",
  brachialis: "biceps", triceps: "triceps", forearms: "antebrazos", wrists: "antebrazos", "wrist flexors": "antebrazos",
  "wrist extensors": "antebrazos", grip: "antebrazos", "grip muscles": "antebrazos", abs: "abdomen", obliques: "abdomen",
  core: "abdomen", "lower abs": "abdomen", "hip flexors": "abdomen", "serratus anterior": "abdomen",
  "upper back": "trapecio", traps: "trapecio", trapezius: "trapecio", rhomboids: "trapecio", "levator scapulae": "trapecio",
  lats: "dorsal", "latissimus dorsi": "dorsal", back: "dorsal", spine: "lumbar", "lower back": "lumbar",
  glutes: "gluteos", abductors: "gluteos", adductors: "cuadriceps", quads: "cuadriceps", quadriceps: "cuadriceps",
  hamstrings: "isquios", calves: "gemelos", soleus: "gemelos", shins: "gemelos",
};
export const toMuscle = (m: string): Muscle | undefined => MAP[m.toLowerCase()];

export const GROUPS = ["pecho", "espalda", "hombro", "biceps", "triceps", "pierna", "brazo", "abdomen"] as const;
export type Group = (typeof GROUPS)[number];
export const GROUP_LABEL: Record<Group, string> = {
  pecho: "Pecho", espalda: "Espalda", hombro: "Hombro", biceps: "Bíceps", triceps: "Tríceps", pierna: "Pierna", brazo: "Brazo", abdomen: "Abdomen",
};
export const GROUP_TARGETS: Record<Group, string[]> = {
  pecho: ["pectorals"], espalda: ["lats", "upper back", "traps", "spine"], hombro: ["delts"], biceps: ["biceps"],
  triceps: ["triceps"], pierna: ["quads", "glutes", "hamstrings", "calves"], brazo: ["biceps", "triceps", "forearms"], abdomen: ["abs"],
};
export const groupOf = (e: Exercise): Group => (Object.keys(GROUP_TARGETS) as Group[]).find((g) => GROUP_TARGETS[g].includes(e.t)) ?? "abdomen";

export const TARGET_LABEL: Record<string, string> = {
  pectorals: "Pecho", delts: "Hombros", biceps: "Bíceps", triceps: "Tríceps", "upper back": "Espalda alta", lats: "Dorsal",
  traps: "Trapecio", quads: "Cuádriceps", glutes: "Glúteos", hamstrings: "Isquios", calves: "Gemelos", abs: "Abdomen",
  forearms: "Antebrazos", spine: "Lumbar",
};
export const muscleLabel = (m: string) => TARGET_LABEL[m] ?? (toMuscle(m) ? MUSCLE_LABEL[toMuscle(m)!] : m);
export const EQ_LABEL: Record<string, string> = {
  barbell: "Barra", dumbbell: "Mancuernas", cable: "Polea", "leverage machine": "Máquina", "body weight": "Peso corporal",
  "smith machine": "Multipower", "ez barbell": "Barra Z", "sled machine": "Prensa", band: "Banda", kettlebell: "Kettlebell",
};
export const eqLabel = (e: string) => EQ_LABEL[e] ?? e;

const COMPOUND_EQ: Record<string, number> = { barbell: 3, "smith machine": 2.5, "sled machine": 2.5, dumbbell: 2, "ez barbell": 1.5, "leverage machine": 1.5, "body weight": 1.5, cable: 1, kettlebell: 1.5, band: 0.5 };
const BIG: Record<string, number> = { glutes: 3, quads: 3, hamstrings: 2, lats: 2.5, "upper back": 2, pectorals: 2.5, spine: 2, delts: 1.5, traps: 1 };
/** Mayor = más desgaste (compuesto) */
export const demand = (e: Exercise) => (COMPOUND_EQ[e.eq] ?? 1) + (BIG[e.t] ?? 0.5) + e.s.length * 0.6;

export function suggestForGroups(groups: Group[], perGroup = groups.length > 2 ? 2 : 3): string[] {
  const out: string[] = [];
  for (const g of groups) {
    const pool = EXERCISES.filter((e) => GROUP_TARGETS[g].includes(e.t)).sort((a, b) => demand(b) - demand(a));
    const usedEq = new Set<string>();
    for (const e of pool) {
      if (out.length && out.includes(e.id)) continue;
      if (usedEq.has(e.eq) && pool.length > perGroup * 2) continue;
      usedEq.add(e.eq); out.push(e.id);
      if (out.filter((id) => groupOf(EX_BY_ID[id]) === g || GROUP_TARGETS[g].includes(EX_BY_ID[id].t)).length >= perGroup) break;
    }
  }
  return [...new Set(out)].sort((a, b) => demand(EX_BY_ID[b]) - demand(EX_BY_ID[a]));
}

export function alternativeFor(id: string, exclude: string[] = []): Exercise | undefined {
  const e = EX_BY_ID[id];
  const pool = EXERCISES.filter((x) => x.t === e.t && x.id !== id && !exclude.includes(x.id));
  return pool.find((x) => x.eq !== e.eq) ?? pool[0];
}
