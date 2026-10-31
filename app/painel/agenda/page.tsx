import Link from "next/link";
import { requireTenant, canOperate, brl } from "@/lib/session";
import { getFreeSlots } from "@/lib/availability";
import { STATUS_LABEL, STATUS_KEYS } from "@/lib/status";
import { addDaysStr, dayBounds, fmtDateLong, fmtTime, isDateStr, todayBR } from "@/lib/time";
import { createAppointment, setAppointmentStatus } from "./actions";

const msgs: Record<string, string> = {
  dados: "Confira os dados do agendamento.",
  permissao: "Você não tem permissão para essa ação.",
  servico: "Esse serviço não está ativo.",
  "nao-executa": "Esse profissional não executa esse serviço. Ajuste em Profissionais.",
  indisponivel: "Esse horário não está mais disponível. Escolha outro.",
  criado: "Agendamento criado.", status: "Situação atualizada.",
};

export default async function Agenda({ searchParams }: { searchParams: Promise<{ dia?: string; prof?: string; serv?: string; erro?: string; ok?: string }> }) {
  const sp = await searchParams;
  const dia = isDateStr(sp.dia) ? sp.dia : todayBR();
  const { supabase, tenantId, role } = await requireTenant();
  const operate = canOperate(role);
  const { start, end } = dayBounds(dia);

  const [pros, servs, custs, appts] = await Promise.all([
    supabase.from("professionals").select("id, display_name").eq("tenant_id", tenantId).eq("is_active", true).order("display_name"),
    supabase.from("services").select("id, name, duration_min, price_cents").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
    supabase.from("customers").select("id, full_name").eq("tenant_id", tenantId).order("full_name").limit(500),
    supabase.from("appointments").select("id, starts_at, ends_at, status, price_cents, notes, customers(full_name), professionals(display_name), services(name)")
      .eq("tenant_id", tenantId).gte("starts_at", start).lt("starts_at", end).order("starts_at"),
  ]);
  const prof = pros.data?.find((p) => p.id === sp.prof);
  const serv = servs.data?.find((s) => s.id === sp.serv);
  const slots = prof && serv ? await getFreeSlots(supabase, tenantId, prof.id, dia, serv.duration_min) : null;
  const rows = (appts.data ?? []) as unknown as { id: string; starts_at: string; ends_at: string; status: keyof typeof STATUS_LABEL; price_cents: number; notes: string | null; customers: { full_name: string } | null; professionals: { display_name: string } | null; services: { name: string } | null }[];
  const nav = (d: string) => `/painel/agenda?${new URLSearchParams({ dia: d, ...(prof ? { prof: prof.id } : {}), ...(serv ? { serv: serv.id } : {}) })}`;

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Agenda</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link className="btn-ghost" href={nav(addDaysStr(dia, -1))}>Dia anterior</Link>
        <Link className="btn-ghost" href={nav(todayBR())}>Hoje</Link>
        <Link className="btn-ghost" href={nav(addDaysStr(dia, 1))}>Próximo dia</Link>
        <span className="ml-2 font-medium capitalize">{fmtDateLong(dia)}</span>
      </div>
      {(sp.erro || sp.ok) && <p role={sp.erro ? "alert" : "status"} className={`mt-4 ${sp.erro ? "text-danger" : "text-ok"}`}>{msgs[(sp.erro ?? sp.ok)!]}</p>}

      {operate && (
        <section className="mt-6 rounded-lg border border-line bg-surface p-4" aria-label="Novo agendamento">
          <h2 className="font-display text-2xl font-bold">Novo agendamento</h2>
          <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
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

      <h2 className="mt-8 font-display text-2xl font-bold">Atendimentos do dia</h2>
      <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
        {rows.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{fmtTime(a.starts_at)}–{fmtTime(a.ends_at)} · {a.customers?.full_name ?? "Cliente"}</p>
              <p className="text-sm text-muted">{a.services?.name} com {a.professionals?.display_name} · {brl(a.price_cents)}{a.notes ? ` · ${a.notes}` : ""}</p>
            </div>
            {operate ? (
              <form action={setAppointmentStatus} className="flex gap-2">
                <input type="hidden" name="id" value={a.id} /><input type="hidden" name="dia" value={dia} />
                <select className="field" name="status" defaultValue={a.status} aria-label="Situação">
                  {STATUS_KEYS.map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
                </select>
                <button className="btn-ghost" type="submit">Atualizar</button>
              </form>
            ) : <span className="text-sm">{STATUS_LABEL[a.status]}</span>}
          </li>
        ))}
        {!rows.length && <li className="p-6 text-muted">Nenhum atendimento neste dia.</li>}
      </ul>
    </>
  );
}
