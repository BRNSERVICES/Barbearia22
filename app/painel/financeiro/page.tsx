import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTenant, canManage, brl } from "@/lib/session";
import { dailyReport, commissionOf, type FinRow } from "@/lib/finance";
import { addDaysStr, addMonths, dateBR, dayBounds, dayNum, fmtDateLong, fmtMonth, fmtTime, isDateStr, monthStart, todayBR, WEEKDAYS_SHORT } from "@/lib/time";

const SEL = "id, starts_at, status, price_cents, customers(full_name), professionals(display_name, commission_pct), services(name)";

export default async function Financeiro({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const sp = await searchParams;
  const dia = isDateStr(sp.dia) ? sp.dia : todayBR();
  const { supabase, tenantId, role } = await requireTenant();
  if (!canManage(role)) redirect("/painel");

  const first = monthStart(dia);
  const nextFirst = addMonths(first, 1);
  const day = dayBounds(dia);
  const [dayRes, monthRes] = await Promise.all([
    supabase.from("appointments").select(SEL).eq("tenant_id", tenantId).gte("starts_at", day.start).lt("starts_at", day.end).order("starts_at"),
    supabase.from("appointments").select("starts_at, price_cents").eq("tenant_id", tenantId).eq("status", "completed")
      .gte("starts_at", dayBounds(first).start).lt("starts_at", dayBounds(nextFirst).start).limit(5000),
  ]);
  const rep = dailyReport((dayRes.data ?? []) as unknown as FinRow[]);

  const perDay = new Map<string, { count: number; total: number }>();
  for (const r of monthRes.data ?? []) {
    const d = dateBR(r.starts_at);
    const cur = perDay.get(d) ?? { count: 0, total: 0 };
    cur.count += 1; cur.total += r.price_cents;
    perDay.set(d, cur);
  }
  const monthTotal = [...perDay.values()].reduce((s, v) => s + v.total, 0);
  const monthCount = [...perDay.values()].reduce((s, v) => s + v.count, 0);
  const daysInMonth = Math.round((Date.parse(`${nextFirst}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / 86_400_000);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => addDaysStr(first, i)).filter((d) => perDay.has(d) || d === dia);
  const href = (d: string) => `/painel/financeiro?dia=${d}`;

  const cards: [string, string, string][] = [
    ["Faturamento do dia", brl(rep.realized), `${rep.done.length} atendimento(s) concluído(s)`],
    ["A receber hoje", brl(rep.expected), `${rep.expectedCount} confirmado(s) ainda não concluído(s)`],
    ["Ticket médio", brl(rep.ticket), "por atendimento concluído"],
    ["Comissões do dia", brl(rep.commission), "conforme o % de cada profissional"],
    ["Perdido", brl(rep.lost), `${rep.lostCount} cancelado(s) ou falta(s)`],
  ];

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Financeiro</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link className="btn-ghost" href={href(addDaysStr(dia, -1))}>Dia anterior</Link>
        <Link className="btn-ghost" href={href(todayBR())}>Hoje</Link>
        <Link className="btn-ghost" href={href(addDaysStr(dia, 1))}>Próximo dia</Link>
        <form className="flex gap-2" role="search"><input className="field" type="date" name="dia" defaultValue={dia} aria-label="Escolher dia" /><button className="btn-ghost" type="submit">Ir</button></form>
        <a className="btn" href={`/painel/financeiro/csv?dia=${dia}`}>Baixar planilha do dia</a>
      </div>
      <p className="mt-3 font-display text-2xl font-bold capitalize">{fmtDateLong(dia)}</p>
      <p className="text-sm text-muted">O faturamento considera só atendimentos marcados como <strong>Concluído</strong> na Agenda.</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 font-display text-3xl font-bold">{value}</dd>
            <p className="mt-1 text-xs text-muted">{hint}</p>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-label="Por profissional">
          <h2 className="font-display text-2xl font-bold">Por profissional</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface2 text-muted"><tr><th className="p-3">Profissional</th><th className="p-3">Atend.</th><th className="p-3">Faturado</th><th className="p-3">Comissão</th></tr></thead>
              <tbody>
                {rep.byProfessional.map((p) => <tr key={p.name} className="border-t border-line"><td className="p-3 font-medium">{p.name}</td><td className="p-3">{p.count}</td><td className="p-3">{brl(p.total)}</td><td className="p-3">{brl(p.commission)}</td></tr>)}
                {!rep.byProfessional.length && <tr><td className="p-4 text-muted" colSpan={4}>Nenhum atendimento concluído neste dia.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section aria-label="Por serviço">
          <h2 className="font-display text-2xl font-bold">Por serviço</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface2 text-muted"><tr><th className="p-3">Serviço</th><th className="p-3">Qtd.</th><th className="p-3">Faturado</th></tr></thead>
              <tbody>
                {rep.byService.map((s) => <tr key={s.name} className="border-t border-line"><td className="p-3 font-medium">{s.name}</td><td className="p-3">{s.count}</td><td className="p-3">{brl(s.total)}</td></tr>)}
                {!rep.byService.length && <tr><td className="p-4 text-muted" colSpan={3}>Nenhum atendimento concluído neste dia.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <h2 className="mt-8 font-display text-2xl font-bold">Atendimentos concluídos</h2>
      <div className="mt-2 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface2 text-muted"><tr><th className="p-3">Hora</th><th className="p-3">Cliente</th><th className="p-3">Serviço</th><th className="p-3">Profissional</th><th className="p-3">Valor</th><th className="p-3">Comissão</th></tr></thead>
          <tbody>
            {rep.done.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="p-3">{fmtTime(r.starts_at)}</td><td className="p-3">{r.customers?.full_name ?? "—"}</td><td className="p-3">{r.services?.name ?? "—"}</td>
                <td className="p-3">{r.professionals?.display_name ?? "—"}</td><td className="p-3">{brl(r.price_cents)}</td><td className="p-3">{brl(commissionOf(r))}</td>
              </tr>
            ))}
            {!rep.done.length && <tr><td className="p-4 text-muted" colSpan={6}>Nada concluído neste dia. Marque os atendimentos como Concluído na Agenda.</td></tr>}
          </tbody>
          {rep.done.length > 0 && <tfoot><tr className="border-t border-line bg-surface2 font-bold"><td className="p-3" colSpan={4}>Total</td><td className="p-3">{brl(rep.realized)}</td><td className="p-3">{brl(rep.commission)}</td></tr></tfoot>}
        </table>
      </div>

      <h2 className="mt-8 font-display text-2xl font-bold capitalize">{fmtMonth(dia)}: dia a dia</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link className="btn-ghost" href={href(addMonths(first, -1))}>Mês anterior</Link>
        <Link className="btn-ghost" href={href(nextFirst)}>Próximo mês</Link>
        <span className="text-sm text-muted">Total do mês: <strong className="text-ink">{brl(monthTotal)}</strong> em {monthCount} atendimento(s)</span>
      </div>
      <div className="mt-2 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface2 text-muted"><tr><th className="p-3">Dia</th><th className="p-3">Atend.</th><th className="p-3">Faturado</th></tr></thead>
          <tbody>
            {monthDays.map((d) => {
              const v = perDay.get(d);
              return (
                <tr key={d} className={`border-t border-line ${d === dia ? "bg-accent/10" : ""}`}>
                  <td className="p-3"><Link className="underline decoration-accent underline-offset-4" href={href(d)}>{WEEKDAYS_SHORT[new Date(`${d}T12:00:00-03:00`).getUTCDay()]} {String(dayNum(d)).padStart(2, "0")}</Link></td>
                  <td className="p-3">{v?.count ?? 0}</td><td className="p-3">{brl(v?.total ?? 0)}</td>
                </tr>
              );
            })}
            {!monthDays.length && <tr><td className="p-4 text-muted" colSpan={3}>Sem atendimentos concluídos neste mês.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
