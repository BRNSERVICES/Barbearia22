import { describe, expect, it } from "vitest";
import { dailyReport, type FinRow } from "./finance";

const row = (status: FinRow["status"], price_cents: number, who = "Davi", pct = 50, svc = "Corte"): FinRow => ({
  id: Math.random().toString(), starts_at: "2026-11-02T13:00:00Z", status, price_cents,
  customers: { full_name: "Cliente" }, professionals: { display_name: who, commission_pct: pct }, services: { name: svc },
});

describe("dailyReport", () => {
  it("só conta concluídos como faturamento", () => {
    const r = dailyReport([row("completed", 3500), row("completed", 5000, "Léo", 40, "Corte e barba"), row("confirmed", 2000), row("cancelled", 3500), row("no_show", 2000)]);
    expect(r.realized).toBe(8500);
    expect(r.expected).toBe(2000);
    expect(r.lost).toBe(5500);
    expect(r.ticket).toBe(4250);
    expect(r.commission).toBe(1750 + 2000);
    expect(r.byProfessional.map((p) => p.name)).toEqual(["Léo", "Davi"]);
  });
  it("não divide por zero sem atendimentos", () => {
    expect(dailyReport([]).ticket).toBe(0);
  });
});
