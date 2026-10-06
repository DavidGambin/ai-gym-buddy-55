import { useState } from "react";
import { MUSCLE_LABEL, type Muscle } from "@/lib/exercises";
import type { Level } from "@/lib/store";

type Shape = { d: string; lx?: number; ly?: number };
// viewBox 0 0 200 420 — each muscle: left side path; right side is mirrored
const FRONT: Partial<Record<Muscle, Shape>> = {
  hombros: { d: "M62 92 C50 92 42 102 42 116 C48 114 56 110 64 106 Z", lx: 30, ly: 98 },
  pecho: { d: "M66 104 C80 96 96 98 99 102 L99 134 C88 140 72 138 64 128 C62 118 62 110 66 104 Z", lx: 100, ly: 118 },
  biceps: { d: "M44 120 C52 118 58 120 60 126 L56 160 C50 164 44 162 42 156 C40 144 40 130 44 120 Z", lx: 22, ly: 140 },
  antebrazos: { d: "M42 164 C48 166 54 166 56 164 L50 210 C46 214 40 214 38 210 C36 194 38 178 42 164 Z", lx: 20, ly: 190 },
  abdomen: { d: "M74 142 C84 144 94 144 99 142 L99 206 C90 212 80 208 76 200 C72 182 72 160 74 142 Z", lx: 100, ly: 176 },
  cuadriceps: { d: "M70 222 C80 216 94 218 98 226 L94 300 C88 308 78 308 74 300 C66 276 64 246 70 222 Z", lx: 40, ly: 262 },
  gemelos: { d: "M74 318 C80 314 90 314 92 320 L88 380 C84 386 78 386 76 380 C72 360 72 336 74 318 Z", lx: 44, ly: 350 },
};
const BACK: Partial<Record<Muscle, Shape>> = {
  trapecio: { d: "M84 78 C90 80 96 82 99 82 L99 130 C90 126 80 116 70 100 C66 94 72 86 84 78 Z", lx: 100, ly: 96 },
  hombros: { d: "M62 92 C50 92 42 102 42 116 C50 114 58 110 66 102 Z", lx: 30, ly: 98 },
  dorsal: { d: "M68 108 C78 122 90 132 99 136 L99 176 C88 176 76 166 70 152 C66 138 64 120 68 108 Z", lx: 40, ly: 150 },
  triceps: { d: "M44 120 C52 118 58 120 60 126 L56 160 C50 164 44 162 42 156 C40 144 40 130 44 120 Z", lx: 22, ly: 128 },
  antebrazos: { d: "M42 164 C48 166 54 166 56 164 L50 210 C46 214 40 214 38 210 C36 194 38 178 42 164 Z", lx: 20, ly: 190 },
  lumbar: { d: "M78 178 C86 182 94 184 99 184 L99 210 C90 212 82 210 76 204 C74 194 76 186 78 178 Z", lx: 100, ly: 196 },
  gluteos: { d: "M72 212 C82 210 94 212 99 216 L99 252 C88 258 76 254 70 244 C68 232 68 220 72 212 Z", lx: 100, ly: 236 },
  isquios: { d: "M70 258 C80 260 92 262 96 260 L94 312 C88 318 78 318 74 312 C68 294 68 274 70 258 Z", lx: 40, ly: 286 },
  gemelos: { d: "M72 318 C80 314 92 314 94 320 L90 372 C84 380 76 380 74 372 C70 354 70 334 72 318 Z", lx: 44, ly: 346 },
};
const SILHOUETTE =
  "M100 20 C112 20 120 30 120 44 C120 58 112 68 100 68 C88 68 80 58 80 44 C80 30 88 20 100 20 Z M88 70 L112 70 L116 82 C130 86 146 88 156 96 C162 104 162 118 160 130 C162 160 164 186 164 214 C164 220 154 220 154 214 L144 168 C142 150 142 136 140 126 C138 160 136 190 132 214 C134 250 132 282 126 314 C128 340 126 366 122 392 L108 392 C106 360 104 330 104 300 L100 240 L96 300 C96 330 94 360 92 392 L78 392 C74 366 72 340 74 314 C68 282 66 250 68 214 C64 190 62 160 60 126 C58 136 58 150 56 168 L46 214 C46 220 36 220 36 214 C36 186 38 160 40 130 C38 118 38 104 44 96 C54 88 70 86 84 82 Z";

const FILL: Record<NonNullable<Level>, string> = { high: "var(--fatigue-high)", mid: "var(--fatigue-mid)", low: "var(--fatigue-low)" };

export function BodyMap({ levels, showLabels = false, size = 260, tags }: { levels: Partial<Record<Muscle, Level>>; showLabels?: boolean; size?: number; tags?: boolean }) {
  const [view, setView] = useState<"front" | "back">("front");
  const shapes = view === "front" ? FRONT : BACK;
  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex rounded-full bg-background p-1 text-xs font-semibold">
        {(["front", "back"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 transition ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {v === "front" ? "Frontal" : "Trasera"}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 200 420" width={size} height={size * 2.1 * 0.92} className="overflow-visible">
        <defs>
          <filter id="mglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <path d={SILHOUETTE} fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1.2" />
        {(Object.keys(shapes) as Muscle[]).map((m) => {
          const lv = levels[m]; const fill = lv ? FILL[lv] : "var(--accent)";
          const d = shapes[m]!.d;
          return (
            <g key={m} id={`muscle-${m}`} filter={lv ? "url(#mglow)" : undefined} opacity={lv ? 0.95 : 0.55}>
              <path d={d} fill={fill} />
              <path d={d} fill={fill} transform="translate(200 0) scale(-1 1)" />
            </g>
          );
        })}
        {showLabels && (Object.keys(shapes) as Muscle[]).filter((m) => levels[m]).map((m) => {
          const s = shapes[m]!; const right = (s.lx ?? 0) >= 100;
          const x = right ? 150 : 2; const y = s.ly ?? 0;
          return (
            <g key={"l" + m}>
              <rect x={right ? 150 : 0} y={y - 9} rx="7" width="50" height="16" fill="var(--card)" stroke="var(--border)" />
              <text x={x + 25 - (right ? 0 : 2)} y={y + 3} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="var(--foreground)">{MUSCLE_LABEL[m]}</text>
            </g>
          );
        })}
      </svg>
      {tags && (
        <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-muted-foreground">
          <Legend c="bg-fatigue-high" t="Hoy · máxima" /><Legend c="bg-fatigue-mid" t="Recuperando" /><Legend c="bg-fatigue-low" t="Ayer · casi" />
        </div>
      )}
    </div>
  );
}
const Legend = ({ c, t }: { c: string; t: string }) => <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{t}</span>;
