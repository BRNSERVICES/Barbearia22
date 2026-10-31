import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant, canOperate, brl } from "@/lib/session";
import { fmtDateTime } from "@/lib/time";
import { STATUS_LABEL } from "@/lib/status";
import { formatPhone } from "@/lib/phone";
import { updateCustomer } from "../actions";

const msgs: Record<string, string> = { dados: "Informe o nome e um WhatsApp com DDD (10 a 13 números).", permissao: "Você não tem permissão para essa ação.", salvo: "Cliente atualizado." };

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
      <form action={updateCustomer} className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_auto]">
        <input type="hidden" name="id" value={id} />
        <label className="text-sm">Nome<input className="field mt-1" name="name" defaultValue={c.data.full_name} required minLength={2} maxLength={120} disabled={dis} /></label>
        <label className="text-sm">WhatsApp com DDD<input className="field mt-1" name="whatsapp" type="tel" defaultValue={formatPhone(c.data.whatsapp ?? c.data.phone)} required disabled={dis} /></label>
        {!dis && <button className="btn self-end" type="submit">Salvar</button>}
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
