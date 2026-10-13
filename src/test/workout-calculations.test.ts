import { describe, expect, it } from "vitest";
import { EXERCISES } from "@/lib/exercises";
import { bestKg, computeFatigue, deleteWorkout, discardWorkout, effectiveLoad, formatDuration, getState, setState, updateWorkout } from "@/lib/store";

describe("Workout loads", () => {
  it("counts both dumbbells without changing the entered kg", () => {
    const e = EXERCISES.find((x) => x.eq === "dumbbell");
    expect(e).toBeDefined();
    if (e) expect(effectiveLoad(e.id, 12.5, 75) * 10).toBe(250);
  });
  it("counts profile weight for bodyweight exercises", () => {
    const e = EXERCISES.find((x) => x.eq === "body weight");
    if (e) expect(effectiveLoad(e.id, 20, 82) * 10).toBe(820);
  });
  it("keeps barbell loads unchanged and prevents negative volume", () => {
    const e = EXERCISES.find((x) => x.eq === "barbell");
    if (e) { expect(effectiveLoad(e.id, 50, 75)).toBe(50); expect(effectiveLoad(e.id, -10, 75)).toBe(0); }
  });
  it("formats hours, minutes and seconds", () => { expect(formatDuration(3665)).toBe("01:01:05"); });
});

describe("Workout date and fatigue", () => {
  it("moves every associated set timestamp and decreases fatigue", () => {
    const e = EXERCISES.find((x) => x.t === "pectorals");
    if (!e) throw new Error("Missing exercise");
    const now = Date.now();
    setState(() => ({ workouts: [{ id: "date-test", day: "lunes", ts: now, durationSec: 3600, volume: 1000, exIds: [e.id] }], sets: [{ exId: e.id, kg: 10, reps: 10, ts: now, workoutId: "date-test" }], recoveryHours: {} }));
    const before = computeFatigue(getState(), now).pecho;
    updateWorkout("date-test", { ts: now - 48 * 3600e3 });
    expect(getState().sets[0].ts).toBe(now - 48 * 3600e3);
    expect(getState().workouts[0].ts).toBe(getState().sets[0].ts);
    expect(computeFatigue(getState(), now).pecho).toBeLessThan(before);
    updateWorkout("date-test", { durationSec: 7200 });
    expect(getState().sets[0].ts).toBe(now - 48 * 3600e3);
  });
});

describe("Removing workouts", () => {
  it("discards only the active session without changing the routine or history", () => {
    setState(() => ({ activeWorkout: { day: "lunes", start: Date.now(), items: [] } }));
    const before = getState();
    discardWorkout();
    expect(getState().activeWorkout).toBeUndefined();
    expect(getState().routine).toBe(before.routine);
    expect(getState().workouts).toBe(before.workouts);
    expect(getState().sets).toBe(before.sets);
  });
  it("deletes associated sets and recalculates records and fatigue, preserving other workouts", () => {
    const e = EXERCISES.find((x) => x.t === "pectorals");
    if (!e) throw new Error("Missing exercise");
    const ts = Date.now();
    setState(() => ({ workouts: ["remove", "keep"].map((id) => ({ id, day: "lunes", ts, durationSec: 10, volume: 100, exIds: [e.id] })), sets: [
      { workoutId: "remove", exId: e.id, kg: 50, reps: 10, ts },
      { workoutId: "keep", exId: e.id, kg: 20, reps: 10, ts },
    ] }));
    deleteWorkout("remove");
    expect(getState().workouts.map((w) => w.id)).toEqual(["keep"]);
    expect(getState().sets.map((l) => l.workoutId)).toEqual(["keep"]);
    expect(bestKg(getState(), e.id)).toBe(20);
    expect(computeFatigue(getState(), ts).pecho).toBe(1);
  });
});