import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant, canOperate, brl } from "@/lib/session";
import { fmtDateTime } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/status";
import { updateCustomer } from "../actions";

const msgs: Record<string, string> = { dados: "Confira os campos do formulário.", permissao: "Você não tem permissão para essa ação.", salvo: "Cliente atualizado." };

export default async function Cliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const [{ id }, { erro, ok }] = await Promise.all([params, searchParams]);
  const { supabase, tenantId, role } = await requireTenant();
  const [c, appts] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("appointments").select("id, starts_at, status, price_cents, services(name), professionals(display_name)")
      .eq("customer_id", id).eq("tenant_id", tenantId).order("starts_at", { ascending: false }).limit(50),
  ]);
  if (!c.data) notFound();
  const dis = !canOperate(role);
  const rows = (appts.data ?? []) as unknown as { id: string; starts_at: string; status: keyof typeof STATUS_LABEL; price_cents: number; services: { name: string } | null; professionals: { display_name: string } | null }[];
  return (
    <>
      <Link href="/painel/clientes" className="text-sm text-accent underline">Voltar para clientes</Link>
      <h1 className="mt-2 font-display text-4xl font-extrabold">{c.data.full_name}</h1>
      {(erro || ok) && <p role={erro ? "alert" : "status"} className={`mt-4 ${erro ? "text-danger" : "text-ok"}`}>{msgs[(erro ?? ok)!]}</p>}
      <form action={updateCustomer} className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="id" value={id} />
        <label className="text-sm">Nome completo<input className="field mt-1" name="name" defaultValue={c.data.full_name} required minLength={2} disabled={dis} /></label>
        <label className="text-sm">Telefone<input className="field mt-1" name="phone" defaultValue={c.data.phone ?? ""} disabled={dis} /></label>
        <label className="text-sm">WhatsApp<input className="field mt-1" name="whatsapp" defaultValue={c.data.whatsapp ?? ""} disabled={dis} /></label>
        <label className="text-sm">E-mail<input className="field mt-1" name="email" type="email" defaultValue={c.data.email ?? ""} disabled={dis} /></label>
        <label className="text-sm">Nascimento<input className="field mt-1" name="birth" type="date" defaultValue={c.data.birth_date ?? ""} disabled={dis} /></label>
        <label className="text-sm">Observações<input className="field mt-1" name="notes" defaultValue={c.data.notes ?? ""} disabled={dis} /></label>
        {!dis && <button className="btn sm:col-span-2 lg:col-span-3" type="submit">Salvar alterações</button>}
      </form>
      <h2 className="mt-8 font-display text-2xl font-bold">Histórico de agendamentos</h2>
      <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
        {rows.map((a) => (
          <li key={a.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
            <span>{fmtDateTime(a.starts_at)} · {a.services?.name ?? "Serviço"} com {a.professionals?.display_name ?? "—"}</span>
            <span className="text-muted">{STATUS_LABEL[a.status]} · {brl(a.price_cents)}</span>
          </li>
        ))}
        {!rows.length && <li className="p-4 text-muted">Este cliente ainda não tem agendamentos.</li>}
      </ul>
    </>
  );
}
