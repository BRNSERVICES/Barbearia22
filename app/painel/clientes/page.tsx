import Link from "next/link";
import { requireTenant, canOperate, canManage } from "@/lib/session";
import { formatPhone } from "@/lib/phone";
import { createCustomer, deleteCustomer } from "./actions";

const PAGE = 20;
const msgs: Record<string, string> = {
  dados: "Informe o nome e um WhatsApp com DDD (10 a 13 números).",
  permissao: "Você não tem permissão para essa ação.",
  "em-uso": "Esse cliente tem agendamentos e não pode ser excluído.",
  criado: "Cliente cadastrado.", excluido: "Cliente excluído.",
};

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; p?: string; erro?: string; ok?: string }> }) {
  const { q = "", p = "1", erro, ok } = await searchParams;
  const page = Math.max(1, Number.parseInt(p) || 1);
  const { supabase, tenantId, role } = await requireTenant();
  let query = supabase.from("customers").select("id, full_name, whatsapp", { count: "exact" }).eq("tenant_id", tenantId);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,whatsapp.ilike.%${term}%`);
  const { data: rows, count } = await query.order("full_name").range((page - 1) * PAGE, page * PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (n: number) => `/painel/clientes?${new URLSearchParams({ ...(term ? { q: term } : {}), p: String(n) })}`;
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Clientes</h1>
      {(erro || ok) && <p role={erro ? "alert" : "status"} className={`mt-4 ${erro ? "text-danger" : "text-ok"}`}>{msgs[(erro ?? ok)!]}</p>}
      {canOperate(role) && (
        <form action={createCustomer} className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_auto]">
          <label className="text-sm">Nome<input className="field mt-1" name="name" required minLength={2} maxLength={120} /></label>
          <label className="text-sm">WhatsApp com DDD<input className="field mt-1" name="whatsapp" type="tel" required placeholder="(11) 90000-0000" autoComplete="off" /></label>
          <button className="btn self-end" type="submit">Cadastrar</button>
        </form>
      )}
      <form className="mt-6 flex gap-2" role="search">
        <input className="field" name="q" defaultValue={term} placeholder="Buscar por nome ou WhatsApp" aria-label="Buscar clientes" />
        <button className="btn-ghost" type="submit">Buscar</button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left">
          <thead className="bg-surface2 text-sm text-muted"><tr><th className="p-3">Nome</th><th className="p-3">WhatsApp</th><th className="p-3">Ações</th></tr></thead>
          <tbody>
            {(rows ?? []).map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3 font-medium">{c.full_name}</td><td className="p-3">{formatPhone(c.whatsapp)}</td>
                <td className="p-3"><div className="flex gap-2">
                  <Link className="btn-ghost" href={`/painel/clientes/${c.id}`}>Abrir</Link>
                  {canManage(role) && <form action={deleteCustomer}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost text-danger" type="submit">Excluir</button></form>}
                </div></td>
              </tr>
            ))}
            {!rows?.length && <tr><td className="p-6 text-muted" colSpan={3}>{term ? "Nenhum cliente encontrado para essa busca." : "Nenhum cliente ainda. Cadastre o primeiro acima."}</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="mt-4 flex items-center gap-3 text-sm" aria-label="Paginação">
          {page > 1 && <Link className="btn-ghost" href={link(page - 1)}>Anterior</Link>}
          <span className="text-muted">Página {page} de {pages}</span>
          {page < pages && <Link className="btn-ghost" href={link(page + 1)}>Próxima</Link>}
        </nav>
      )}
    </>
  );
}
