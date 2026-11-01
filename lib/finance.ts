import type { Status } from "./status";

export type FinRow = {
  id: string; starts_at: string; status: Status; price_cents: number;
  customers: { full_name: string } | null;
  professionals: { display_name: string; commission_pct: number | string } | null;
  services: { name: string } | null;
};

const EXPECTED: Status[] = ["confirmed", "in_service"];
const LOST: Status[] = ["cancelled", "no_show"];
const sum = (rows: FinRow[]) => rows.reduce((s, r) => s + r.price_cents, 0);
export const commissionOf = (r: FinRow) => Math.round((r.price_cents * Number(r.professionals?.commission_pct ?? 0)) / 100);

// Relatório do dia. Faturamento só conta atendimento "Concluído"; confirmado e em atendimento entram como "a receber".
export function dailyReport(rows: FinRow[]) {
  const done = rows.filter((r) => r.status === "completed");
  const realized = sum(done);
  const group = (key: (r: FinRow) => string) => {
    const m = new Map<string, { name: string; count: number; total: number; commission: number }>();
    for (const r of done) {
      const k = key(r);
      const cur = m.get(k) ?? { name: k, count: 0, total: 0, commission: 0 };
      cur.count += 1; cur.total += r.price_cents; cur.commission += commissionOf(r);
      m.set(k, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  };
  return {
    done, realized,
    expected: sum(rows.filter((r) => EXPECTED.includes(r.status))),
    expectedCount: rows.filter((r) => EXPECTED.includes(r.status)).length,
    lost: sum(rows.filter((r) => LOST.includes(r.status))),
    lostCount: rows.filter((r) => LOST.includes(r.status)).length,
    ticket: done.length ? Math.round(realized / done.length) : 0,
    commission: done.reduce((s, r) => s + commissionOf(r), 0),
    byProfessional: group((r) => r.professionals?.display_name ?? "—"),
    byService: group((r) => r.services?.name ?? "—"),
  };
}
