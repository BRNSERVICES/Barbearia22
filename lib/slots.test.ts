import { describe, expect, it } from "vitest";
import { computeSlots } from "./slots";

const past = new Date("2000-01-01T00:00:00Z");
const base = { date: "2030-01-07", start: "09:00", end: "11:00", now: past };
const labels = (s: { hhmm: string }[]) => s.map((x) => x.hhmm);

describe("computeSlots", () => {
  it("só oferece horários em que o serviço inteiro cabe antes de fechar", () => {
    expect(labels(computeSlots({ ...base, durationMin: 90, busy: [] }))).toEqual(["09:00", "09:15", "09:30"]);
  });
  it("pula horários que sobrepõem um atendimento existente", () => {
    const busy = [{ starts_at: "2030-01-07T12:30:00Z", ends_at: "2030-01-07T13:00:00Z" }]; // 09:30-10:00 em Brasília
    expect(labels(computeSlots({ ...base, durationMin: 30, stepMin: 30, busy }))).toEqual(["09:00", "10:00", "10:30"]);
  });
  it("respeita o intervalo da jornada", () => {
    const r = computeSlots({ ...base, durationMin: 30, stepMin: 30, busy: [], breakStart: "09:30", breakEnd: "10:00" });
    expect(labels(r)).toEqual(["09:00", "10:00", "10:30"]);
  });
  it("não oferece horários no passado", () => {
    const now = new Date("2030-01-07T12:00:00Z"); // 09:00 em Brasília
    expect(labels(computeSlots({ ...base, now, durationMin: 60, stepMin: 60, busy: [] }))).toEqual(["09:00", "10:00"]);
    const later = new Date("2030-01-07T12:01:00Z");
    expect(labels(computeSlots({ ...base, now: later, durationMin: 60, stepMin: 60, busy: [] }))).toEqual(["10:00"]);
  });
});
