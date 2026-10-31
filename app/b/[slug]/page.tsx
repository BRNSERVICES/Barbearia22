import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFreeSlots } from "@/lib/availability";
import { brl } from "@/lib/session";
import { addDaysStr, fmtDateLong, isDateStr, todayBR } from "@/lib/time";
import { createPublicBooking } from "./actions";

export const metadata = { robots: { index: false } };

const msgs: Record<string, string> = {
  dados: "Confira os dados: nome, telefone com DDD e a autorização de contato.",
  data: "Escolha uma data entre hoje e os próximos 60 dias.",
  indisponivel: "Esse horário acabou de ser ocupado. Escolha outro.",
  limite: "Você já tem 3 pedidos em aberto. Aguarde a confirmação da barbearia.",
  falha: "Não foi possível agendar agora. Tente novamente em instantes.",
};

export default async function Publica({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ serv?: string; prof?: string; dia?: string; erro?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id, name").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!tenant) notFound();
  const tid = tenant.id as string;
  const [services, pros, links] = await Promise.all([
    admin.from("services").select("id, name, price_cents, duration_min").eq("tenant_id", tid).eq("is_active", true).order("name"),
    admin.from("professionals").select("id, display_name").eq("tenant_id", tid).eq("is_active", true).order("display_name"),
    admin.from("professional_services").select("professional_id, service_id").eq("tenant_id", tid),
  ]);
  const serv = services.data?.find((s) => s.id === sp.serv);
  const options = serv ? (pros.data ?? []).filter((p) => links.data?.some((l) => l.professional_id === p.id && l.service_id === serv.id)) : [];
  const prof = options.find((p) => p.id === sp.prof);
  const min = todayBR(), max = addDaysStr(min, 60);
  const dia = isDateStr(sp.dia) && sp.dia >= min && sp.dia <= max ? sp.dia : min;
  const slots = serv && prof ? await getFreeSlots(admin, tid, prof.id, dia, serv.duration_min) : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="font-display text-xl text-accent">{tenant.name}</p>
      <h1 className="font-display text-5xl font-extrabold leading-none">Agende seu horário</h1>
      {sp.erro && <p role="alert" className="mt-4 text-danger">{msgs[sp.erro] ?? msgs.falha}</p>}

      <form className="mt-8 space-y-4 rounded-lg border border-line bg-surface p-4">
        <label className="block text-sm">1. Serviço
          <select className="field mt-1" name="serv" defaultValue={serv?.id ?? ""} required>
            <option value="" disabled>Escolha o serviço</option>
            {(services.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} · {brl(s.price_cents)} · {s.duration_min} min</option>)}
          </select>
        </label>
        {serv && (
          <label className="block text-sm">2. Profissional
            <select className="field mt-1" name="prof" defaultValue={prof?.id ?? ""} required>
              <option value="" disabled>Escolha o profissional</option>
              {options.map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
            {!options.length && <span className="text-muted"> Nenhum profissional disponível para este serviço.</span>}
          </label>
        )}
        <label className="block text-sm">{serv ? "3. " : "2. "}Dia
          <input className="field mt-1" type="date" name="dia" min={min} max={max} defaultValue={dia} required />
        </label>
        <button className="btn" type="submit">{serv ? "Ver horários livres" : "Continuar"}</button>
      </form>

      {slots && serv && prof && (
        slots.length === 0 ? (
          <p className="mt-6 text-muted">Sem horários livres para {prof.display_name} neste dia. Tente outro dia ou outro profissional.</p>
        ) : (
          <form action={createPublicBooking} className="mt-6 space-y-4 rounded-lg border border-line bg-surface p-4">
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="serv" value={serv.id} />
            <input type="hidden" name="prof" value={prof.id} /><input type="hidden" name="dia" value={dia} />
            <div className="hidden" aria-hidden="true"><label>Não preencha<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <fieldset>
              <legend className="text-sm capitalize">Horários livres · {fmtDateLong(dia)}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {slots.map((s, i) => (
                  <label key={s.startIso} className="cursor-pointer">
                    <input className="peer sr-only" type="radio" name="start" value={s.startIso} required defaultChecked={i === 0} />
                    <span className="btn-ghost block peer-checked:bg-accent peer-checked:text-accentink">{s.hhmm}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm">Seu nome<input className="field mt-1" name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
            <label className="block text-sm">WhatsApp com DDD<input className="field mt-1" name="phone" type="tel" required autoComplete="tel" placeholder="(11) 90000-0000" /></label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consent" required className="mt-1" />
              <span>Autorizo a barbearia a usar meu nome e telefone para confirmar este agendamento.</span>
            </label>
            <button className="btn w-full" type="submit">Pedir este horário</button>
          </form>
        )
      )}
    </main>
  );
}
