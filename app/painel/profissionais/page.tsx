import Link from "next/link";
import { requireTenant, canManage } from "@/lib/session";
import { createProfessional, deleteProfessional, toggleProfessional } from "./actions";

const msgs: Record<string, string> = {
  dados: "Confira o nome e a comissão (0 a 100%).",
  permissao: "Você não tem permissão para essa ação.",
  "em-uso": "Esse profissional tem agendamentos. Desative-o em vez de excluir.",
  excluido: "Profissional excluído.",
};

export default async function Profissionais({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const { supabase, tenantId, role } = await requireTenant();
  const edit = canManage(role);
  const { data: pros } = await supabase.from("professionals")
    .select("id, display_name, commission_pct, is_active").eq("tenant_id", tenantId).order("display_name");
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Profissionais</h1>
      {(erro || ok) && <p role={erro ? "alert" : "status"} className={`mt-4 ${erro ? "text-danger" : "text-ok"}`}>{msgs[(erro ?? ok)!]}</p>}
      {edit && (
        <form action={createProfessional} className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_auto]">
          <label className="text-sm">Nome<input className="field mt-1" name="name" required minLength={2} /></label>
          <label className="text-sm">Comissão (%)<input className="field mt-1" name="commission" type="number" min="0" max="100" step="0.5" defaultValue={50} required /></label>
          <button className="btn self-end" type="submit">Adicionar e configurar</button>
        </form>
      )}
      <ul className="mt-6 divide-y divide-line rounded-lg border border-line">
        {(pros ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{p.display_name}</p>
              <p className="text-sm text-muted">Comissão {Number(p.commission_pct)}% · {p.is_active ? "Ativo" : "Inativo"}</p>
            </div>
            <div className="flex gap-2">
              <Link className="btn-ghost" href={`/painel/profissionais/${p.id}`}>{edit ? "Configurar" : "Ver"}</Link>
              {edit && (
                <>
                  <form action={toggleProfessional}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(p.is_active)} />
                    <button className="btn-ghost" type="submit">{p.is_active ? "Desativar" : "Ativar"}</button>
                  </form>
                  <form action={deleteProfessional}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn-ghost text-danger" type="submit">Excluir</button>
                  </form>
                </>
              )}
            </div>
          </li>
        ))}
        {!pros?.length && <li className="p-6 text-muted">Nenhum profissional ainda. Adicione o primeiro acima.</li>}
      </ul>
    </>
  );
}
