import Link from "next/link";
import { z } from "zod";
import { requireTenant, canOperate, brl } from "@/lib/session";
import { getFreeSlots } from "@/lib/availability";
import { STATUS_LABEL, STATUS_KEYS, NEEDS_CONFIRMATION, needsConfirmation } from "@/lib/status";
import { addDaysStr, addMonths, dateBR, dayBounds, fmtDateLong, fmtMonth, fmtShort, fmtTime, isDateStr, monthStart, todayBR, weekdayOf } from "@/lib/time";
import { waLink } from "@/lib/phone";
import { confirmationMessage } from "@/lib/whatsapp";
import { createAppointment, setAppointmentStatus, confirmAppointment } from "./actions";
import { Legend, MonthView, WeekView, groupByDay, type Row } from "./views";

const msgs: Record<string, string> = {
  dados: "Confira os dados do agendamento.",
  permissao: "Você não tem permissão para essa ação.",
  servico: "Esse serviço não está ativo.",
  "nao-executa": "Esse profissional não executa esse serviço. Ajuste em Profissionais.",
  indisponivel: "Esse horário não está mais disponível. Escolha outro.",
  criado: "Agendamento criado.", status: "Situação atualizada.", confirmado: "Agendamento confirmado.",
  "ja-tratado": "Esse pedido já foi confirmado ou alterado por outra pessoa.",
};
const VISTAS = ["dia", "semana", "mes"] as const;
type Vista = (typeof VISTAS)[number];

export default async function Agenda({ searchParams }: { searchParams: Promise<{ dia?: string; vista?: string; prof?: string; serv?: string; erro?: string; ok?: string; wa?: string }> }) {
  const sp = await searchParams;
  const dia = isDateStr(sp.dia) ? sp.dia : todayBR();
  const vista: Vista = (VISTAS as readonly string[]).includes(sp.vista ?? "") ? (sp.vista as Vista) : "semana";
  const { supabase, tenantId, role, tenant } = await requireTenant();
  const operate = canOperate(role);

  // Janela de datas da vista: dia, semana (domingo a sábado) ou mês (grade de 6 semanas).
  const first = monthStart(dia);
  const weekStart = addDaysStr(dia, -weekdayOf(dia));
  const gridStart = addDaysStr(first, -weekdayOf(first));
  const [from, to] = vista === "dia" ? [dia, addDaysStr(dia, 1)] : vista === "semana" ? [weekStart, addDaysStr(weekStart, 7)] : [gridStart, addDaysStr(gridStart, 42)];
  const start = dayBounds(from).start, end = dayBounds(to).start;
  const waId = z.uuid().safeParse(sp.wa);
  const sel = "id, starts_at, ends_at, status, price_cents, notes, customers(full_name, whatsapp), professionals(display_name), services(name)";

  const [pros, servs, custs, appts, pend, waAppt] = await Promise.all([
    supabase.from("professionals").select("id, display_name").eq("tenant_id", tenantId).eq("is_active", true).order("display_name"),
    supabase.from("services").select("id, name, duration_min, price_cents").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
    supabase.from("customers").select("id, full_name").eq("tenant_id", tenantId).order("full_name").limit(500),
    supabase.from("appointments").select(sel).eq("tenant_id", tenantId).gte("starts_at", start).lt("starts_at", end).order("starts_at").limit(1000),
    supabase.from("appointments").select(sel).eq("tenant_id", tenantId).in("status", NEEDS_CONFIRMATION).gte("starts_at", dayBounds(todayBR()).start).order("starts_at").limit(50),
    waId.success ? supabase.from("appointments").select(sel).eq("tenant_id", tenantId).eq("id", waId.data).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const prof = pros.data?.find((p) => p.id === sp.prof);
  const serv = servs.data?.find((s) => s.id === sp.serv);
  const slots = prof && serv ? await getFreeSlots(supabase, tenantId, prof.id, dia, serv.duration_min) : null;
  const rows = (appts.data ?? []) as unknown as Row[];
  const pendings = (pend.data ?? []) as unknown as Row[];
  const wa = waAppt.data as unknown as Row | null;
  const waUrl = wa ? waLink(wa.customers?.whatsapp, confirmationMessage({ customer: wa.customers?.full_name, shop: tenant.name, service: wa.services?.name, professional: wa.professionals?.display_name, startsAt: wa.starts_at })) : null;
  const byDay = groupByDay(rows);
  const q = (d: string, v: Vista = vista) => `/painel/agenda?${new URLSearchParams({ dia: d, vista: v, ...(prof ? { prof: prof.id } : {}), ...(serv ? { serv: serv.id } : {}) })}`;
  const goDay = (d: string) => q(d, "dia");
  const step = (dir: 1 | -1) => vista === "dia" ? addDaysStr(dia, dir) : vista === "semana" ? addDaysStr(dia, 7 * dir) : addMonths(first, dir);
  const label = vista === "dia" ? fmtDateLong(dia) : vista === "semana" ? `${fmtShort(weekStart)} a ${fmtShort(addDaysStr(weekStart, 6))}` : fmtMonth(dia);
  const PREV = { dia: "Dia anterior", semana: "Semana anterior", mes: "Mês anterior" }[vista];
  const NEXT = { dia: "Próximo dia", semana: "Próxima semana", mes: "Próximo mês" }[vista];
  const TAB = { dia: "Dia", semana: "Semana", mes: "Mês" } as const;

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Agenda</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <nav className="flex overflow-hidden rounded-md border border-line" aria-label="Tipo de visualização">
          {VISTAS.map((v) => (
            <Link key={v} href={q(dia, v)} aria-current={v === vista ? "page" : undefined}
              className={`px-4 py-2 text-sm font-semibold ${v === vista ? "bg-accent text-accentink" : "hover:bg-surface2"}`}>{TAB[v]}</Link>
          ))}
        </nav>
        <Link className="btn-ghost" href={q(step(-1))}>{PREV}</Link>
        <Link className="btn-ghost" href={q(todayBR())}>Hoje</Link>
        <Link className="btn-ghost" href={q(step(1))}>{NEXT}</Link>
        <span className="ml-2 font-medium capitalize">{label}</span>
      </div>
      {(sp.erro || sp.ok) && <p role={sp.erro ? "alert" : "status"} className={`mt-4 ${sp.erro ? "text-danger" : "text-ok"}`}>{msgs[(sp.erro ?? sp.ok)!] ?? "Pronto."}</p>}
      {wa && sp.ok && (
        waUrl ? (
          <p className="mt-2">
            <a className="btn inline-block" href={waUrl} target="_blank" rel="noopener noreferrer">Avisar {wa.customers?.full_name?.split(" ")[0] ?? "cliente"} no WhatsApp</a>
            <span className="ml-3 text-sm text-muted">Abre o WhatsApp com a confirmação pronta; falta só tocar em enviar.</span>
          </p>
        ) : <p className="mt-2 text-sm text-muted">Este cliente não tem WhatsApp válido cadastrado. Ajuste em Clientes para poder avisar.</p>
      )}

      {pendings.length > 0 && (
        <section className="mt-6 rounded-lg border-2 border-accent bg-accent/10 p-4" aria-label="Pedidos aguardando confirmação">
          <h2 className="font-display text-2xl font-bold">
            <span className="mr-2 rounded-full bg-accent px-2.5 py-0.5 text-accentink">{pendings.length}</span>
            {pendings.length === 1 ? "pedido aguardando confirmação" : "pedidos aguardando confirmação"}
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {pendings.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    <Link className="underline decoration-accent underline-offset-4" href={goDay(dateBR(a.starts_at))}>{fmtShort(dateBR(a.starts_at))} às {fmtTime(a.starts_at)}</Link> · {a.customers?.full_name ?? "Cliente"}
                  </p>
                  <p className="text-sm text-muted">{a.services?.name} com {a.professionals?.display_name} · {brl(a.price_cents)}</p>
                </div>
                {operate && (
                  <div className="flex gap-2">
                    <form action={confirmAppointment}>
                      <input type="hidden" name="id" value={a.id} /><input type="hidden" name="dia" value={dia} /><input type="hidden" name="vista" value={vista} />
                      <button className="btn" type="submit">Confirmar</button>
                    </form>
                    <form action={setAppointmentStatus}>
                      <input type="hidden" name="id" value={a.id} /><input type="hidden" name="dia" value={dia} /><input type="hidden" name="vista" value={vista} /><input type="hidden" name="status" value="cancelled" />
                      <button className="btn-ghost" type="submit">Recusar</button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {vista === "semana" && <><Legend /><WeekView start={weekStart} byDay={byDay} href={goDay} /></>}
      {vista === "mes" && <><Legend /><MonthView first={first} byDay={byDay} href={goDay} /></>}

      {operate && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-4" aria-label="Novo agendamento">
          <h2 className="font-display text-2xl font-bold">Novo agendamento</h2>
          <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input type="hidden" name="vista" value={vista} />
            <label className="text-sm">Profissional
              <select className="field mt-1" name="prof" defaultValue={prof?.id ?? ""} required>
                <option value="" disabled>Escolha</option>
                {(pros.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
              </select>
            </label>
            <label className="text-sm">Serviço
              <select className="field mt-1" name="serv" defaultValue={serv?.id ?? ""} required>
                <option value="" disabled>Escolha</option>
                {(servs.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} · {brl(s.price_cents)} · {s.duration_min} min</option>)}
              </select>
            </label>
            <label className="text-sm">Dia<input className="field mt-1" type="date" name="dia" defaultValue={dia} required /></label>
            <button className="btn self-end" type="submit">Ver horários</button>
          </form>

          {slots && prof && serv && (
            slots.length === 0 ? (
              <p className="mt-4 text-muted">Sem horários livres para {prof.display_name} neste dia. Confira a jornada do profissional ou escolha outro dia.</p>
            ) : (
              <form action={createAppointment} className="mt-4 space-y-4">
                <input type="hidden" name="prof" value={prof.id} /><input type="hidden" name="serv" value={serv.id} /><input type="hidden" name="dia" value={dia} />
                <fieldset>
                  <legend className="text-sm">Horários livres</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slots.map((s, i) => (
                      <label key={s.startIso} className="cursor-pointer">
                        <input className="peer sr-only" type="radio" name="start" value={s.startIso} required defaultChecked={i === 0} />
                        <span className="btn-ghost block peer-checked:bg-accent peer-checked:text-accentink peer-focus-visible:outline-2">{s.hhmm}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm">Cliente
                  <select className="field mt-1" name="customer" required defaultValue="">
                    <option value="" disabled>Escolha o cliente</option>
                    {(custs.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                  {!custs.data?.length && <span className="text-muted"> Cadastre um cliente em Clientes primeiro.</span>}
                </label>
                <label className="block text-sm">Observações<input className="field mt-1" name="notes" maxLength={1000} /></label>
                <button className="btn" type="submit">Confirmar agendamento</button>
              </form>
            )
          )}
        </section>
      )}

      {vista === "dia" && <>
      <h2 className="mt-8 font-display text-2xl font-bold">Atendimentos do dia</h2>
      <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
        {rows.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{fmtTime(a.starts_at)}–{fmtTime(a.ends_at)} · {a.customers?.full_name ?? "Cliente"}</p>
              <p className="text-sm text-muted">{a.services?.name} com {a.professionals?.display_name} · {brl(a.price_cents)}{a.notes ? ` · ${a.notes}` : ""}</p>
            </div>
            {operate ? (
              <div className="flex flex-wrap items-center gap-2">
                {needsConfirmation(a.status) && (
                  <form action={confirmAppointment}>
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="dia" value={dia} /><input type="hidden" name="vista" value="dia" />
                    <button className="btn" type="submit">Confirmar</button>
                  </form>
                )}
                {(a.status === "confirmed" || a.status === "in_service") && (
                  <form action={setAppointmentStatus}>
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="dia" value={dia} /><input type="hidden" name="vista" value="dia" /><input type="hidden" name="status" value="completed" />
                    <button className="btn-ghost" type="submit">Concluir</button>
                  </form>
                )}
                {a.status === "confirmed" && (() => {
                  const l = waLink(a.customers?.whatsapp, confirmationMessage({ customer: a.customers?.full_name, shop: tenant.name, service: a.services?.name, professional: a.professionals?.display_name, startsAt: a.starts_at }));
                  return l ? <a className="btn-ghost" href={l} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null;
                })()}
              <form action={setAppointmentStatus} className="flex gap-2">
                <input type="hidden" name="id" value={a.id} /><input type="hidden" name="dia" value={dia} /><input type="hidden" name="vista" value="dia" />
                <select className="field" name="status" defaultValue={a.status} aria-label="Situação">
                  {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
                </select>
                <button className="btn-ghost" type="submit">Atualizar</button>
              </form>
              </div>
            ) : <span className="text-sm">{STATUS_LABEL[a.status]}</span>}
          </li>
        ))}
        {!rows.length && <li className="p-6 text-muted">Nenhum atendimento neste dia.</li>}
      </ul>
      </>}
    </>
  );
}
