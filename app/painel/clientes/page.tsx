import Link from "next/link";
import { requireTenant, canOperate, canManage } from "@/lib/session";
import { createCustomer, deleteCustomer } from "./actions";

const PAGE = 20;
const msgs: Record<string, string> = {
  dados: "Confira os campos: nome (mín. 2 letras), e-mail e data válidos.",
  permissao: "Você não tem permissão para essa ação.",
  "em-uso": "Esse cliente tem agendamentos e não pode ser excluído.",
  criado: "Cliente cadastrado.", excluido: "Cliente excluído.",
};

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string; p?: string; erro?: string; ok?: string }> }) {
  const { q = "", p = "1", erro, ok } = await searchParams;
  const page = Math.max(1, Number.parseInt(p) || 1);
  const { supabase, tenantId, role } = await requireTenant();
  let query = supabase.from("customers").select("id, full_name, phone, whatsapp", { count: "exact" }).eq("tenant_id", tenantId);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,whatsapp.ilike.%${term}%`);
  const { data: rows, count } = await query.order("full_name").range((page - 1) * PAGE, page * PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (n: number) => `/painel/clientes?${new URLSearchParams({ ...(term ? { q: term } : {}), p: String(n) })}`;
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Clientes</h1>
      {(erro || ok) && <p role={erro ? "alert" : "status"} className={`mt-4 ${erro ? "text-danger" : "text-ok"}`}>{msgs[(erro ?? ok)!]}</p>}
      {canOperate(role) && (
        <form action={createCustomer} className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">Nome completo<input className="field mt-1" name="name" required minLength={2} /></label>
          <label className="text-sm">Telefone<input className="field mt-1" name="phone" type="tel" maxLength={20} /></label>
          <label className="text-sm">WhatsApp<input className="field mt-1" name="whatsapp" type="tel" maxLength={20} /></label>
          <label className="text-sm">E-mail<input className="field mt-1" name="email" type="email" /></label>
          <label className="text-sm">Nascimento<input className="field mt-1" name="birth" type="date" /></label>
          <label className="text-sm">Observações<input className="field mt-1" name="notes" maxLength={1000} /></label>
          <button className="btn sm:col-span-2 lg:col-span-3" type="submit">Cadastrar cliente</button>
        </form>
      )}
      <form className="mt-6 flex gap-2" role="search">
        <input className="field" name="q" defaultValue={term} placeholder="Buscar por nome ou telefone" aria-label="Buscar clientes" />
        <button className="btn-ghost" type="submit">Buscar</button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left">
          <thead className="bg-surface2 text-sm text-muted"><tr><th className="p-3">Nome</th><th className="p-3">Telefone</th><th className="p-3">WhatsApp</th><th className="p-3">Ações</th></tr></thead>
          <tbody>
            {(rows ?? []).map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="p-3 font-medium">{c.full_name}</td><td className="p-3">{c.phone ?? "—"}</td><td className="p-3">{c.whatsapp ?? "—"}</td>
                <td className="p-3"><div className="flex gap-2">
                  <Link className="btn-ghost" href={`/painel/clientes/${c.id}`}>Abrir</Link>
                  {canManage(role) && <form action={deleteCustomer}><input type="hidden" name="id" value={c.id} /><button className="btn-ghost text-danger" type="submit">Excluir</button></form>}
                </div></td>
              </tr>
            ))}
            {!rows?.length && <tr><td className="p-6 text-muted" colSpan={4}>{term ? "Nenhum cliente encontrado para essa busca." : "Nenhum cliente ainda. Cadastre o primeiro acima."}</td></tr>}
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
