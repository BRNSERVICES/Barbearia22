import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant, canManage } from "@/lib/session";
import { WEEKDAYS } from "@/lib/time";
import { saveProfessionalDetails, saveProfessionalServices, saveWorkingHours } from "../actions";

const msgs: Record<string, string> = {
  dados: "Confira o nome e a comissão (0 a 100%).",
  horario: "Em cada dia marcado, o fim precisa ser depois do início.",
  permissao: "Você não tem permissão para essa ação.",
  criado: "Profissional criado. Agora marque os serviços e a jornada.",
  salvo: "Dados salvos.", servicos: "Serviços salvos.", jornada: "Jornada salva.",
};

export default async function Profissional({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  const { supabase, tenantId, role } = await requireTenant();
  const edit = canManage(role);
  const [pro, services, mine, hours] = await Promise.all([
    supabase.from("professionals").select("id, display_name, commission_pct").eq("id", id).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("services").select("id, name").eq("tenant_id", tenantId).eq("is_active", true).order("name"),
    supabase.from("professional_services").select("service_id").eq("professional_id", id).eq("tenant_id", tenantId),
    supabase.from("working_hours").select("weekday, start_time, end_time").eq("professional_id", id).eq("tenant_id", tenantId),
  ]);
  if (!pro.data) notFound();
  const chosen = new Set((mine.data ?? []).map((r) => r.service_id));
  const hoursByDay = new Map((hours.data ?? []).map((h) => [h.weekday, h]));
  const dis = !edit;
  return (
    <>
      <Link href="/painel/profissionais" className="text-sm text-accent underline">Voltar para profissionais</Link>
      <h1 className="mt-2 font-display text-4xl font-extrabold">{pro.data.display_name}</h1>
      {(erro || ok) && <p role={erro ? "alert" : "status"} className={`mt-4 ${erro ? "text-danger" : "text-ok"}`}>{msgs[(erro ?? ok)!]}</p>}

      <form action={saveProfessionalDetails} className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_auto]">
        <input type="hidden" name="id" value={id} />
        <label className="text-sm">Nome<input className="field mt-1" name="name" defaultValue={pro.data.display_name} required minLength={2} disabled={dis} /></label>
        <label className="text-sm">Comissão (%)<input className="field mt-1" name="commission" type="number" min="0" max="100" step="0.5" defaultValue={Number(pro.data.commission_pct)} required disabled={dis} /></label>
        {edit && <button className="btn self-end" type="submit">Salvar</button>}
      </form>

      <form action={saveProfessionalServices} className="mt-6 rounded-lg border border-line bg-surface p-4">
        <input type="hidden" name="id" value={id} />
        <h2 className="font-display text-2xl font-bold">Serviços que executa</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(services.data ?? []).map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="service" value={s.id} defaultChecked={chosen.has(s.id)} disabled={dis} /> {s.name}
            </label>
          ))}
          {!services.data?.length && <p className="text-muted">Cadastre serviços primeiro.</p>}
        </div>
        {edit && <button className="btn mt-4" type="submit">Salvar serviços</button>}
      </form>

      <form action={saveWorkingHours} className="mt-6 rounded-lg border border-line bg-surface p-4">
        <input type="hidden" name="id" value={id} />
        <h2 className="font-display text-2xl font-bold">Jornada semanal</h2>
        <p className="text-sm text-muted">Marque os dias em que atende. Dias sem marcação ficam sem horários na agenda.</p>
        <div className="mt-3 space-y-2">
          {WEEKDAYS.map((name, d) => {
            const h = hoursByDay.get(d);
            return (
              <div key={d} className="grid grid-cols-[7rem_1fr_1fr] items-center gap-3 sm:grid-cols-[8rem_9rem_9rem]">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={`on_${d}`} defaultChecked={!!h} disabled={dis} /> {name}</label>
                <input className="field" type="time" name={`start_${d}`} defaultValue={h?.start_time.slice(0, 5) ?? "09:00"} aria-label={`${name}: início`} disabled={dis} />
                <input className="field" type="time" name={`end_${d}`} defaultValue={h?.end_time.slice(0, 5) ?? "18:00"} aria-label={`${name}: fim`} disabled={dis} />
              </div>
            );
          })}
        </div>
        {edit && <button className="btn mt-4" type="submit">Salvar jornada</button>}
      </form>
    </>
  );
}
