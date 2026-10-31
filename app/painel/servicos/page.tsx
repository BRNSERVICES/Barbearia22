import { requireTenant, brl } from "@/lib/session";
import { createService, deleteService, toggleService } from "./actions";

const msgs: Record<string, string> = {
  dados: "Confira nome, preço e duração (mínimo de 5 minutos).",
  duplicado: "Já existe um serviço com esse nome.",
  permissao: "Você não tem permissão para essa ação.",
  "em-uso": "Esse serviço tem agendamentos. Desative-o em vez de excluir.",
  criado: "Serviço criado.",
  excluido: "Serviço excluído.",
};

export default async function Servicos({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const { supabase, tenantId, role } = await requireTenant();
  const canEdit = role === "owner" || role === "manager";
  const { data: services } = await supabase
    .from("services").select("id, name, price_cents, duration_min, is_active")
    .eq("tenant_id", tenantId).order("name");
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Serviços</h1>
      {(erro || ok) && (
        <p role={erro ? "alert" : "status"} className={`mt-4 ${erro ? "text-danger" : "text-ok"}`}>{msgs[(erro ?? ok)!]}</p>
      )}
      {canEdit && (
        <form action={createService} className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="text-sm">Nome<input className="field mt-1" name="name" required minLength={2} /></label>
          <label className="text-sm">Preço (R$)<input className="field mt-1" name="price" type="number" step="0.01" min="0" required /></label>
          <label className="text-sm">Duração (min)<input className="field mt-1" name="duration" type="number" min="5" step="5" defaultValue={30} required /></label>
          <button className="btn self-end" type="submit">Adicionar</button>
        </form>
      )}
      <div className="mt-6 overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-left">
          <thead className="bg-surface2 text-sm text-muted">
            <tr><th className="p-3">Serviço</th><th className="p-3">Preço</th><th className="p-3">Duração</th><th className="p-3">Situação</th>{canEdit && <th className="p-3">Ações</th>}</tr>
          </thead>
          <tbody>
            {(services ?? []).map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3">{brl(s.price_cents)}</td>
                <td className="p-3">{s.duration_min} min</td>
                <td className="p-3">{s.is_active ? "Ativo" : "Inativo"}</td>
                {canEdit && (
                  <td className="p-3">
                    <div className="flex gap-2">
                      <form action={toggleService}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={String(s.is_active)} />
                        <button className="btn-ghost" type="submit">{s.is_active ? "Desativar" : "Ativar"}</button>
                      </form>
                      <form action={deleteService}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="btn-ghost text-danger" type="submit">Excluir</button>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!services?.length && (
              <tr><td className="p-6 text-muted" colSpan={5}>Nenhum serviço ainda. Adicione o primeiro acima.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
