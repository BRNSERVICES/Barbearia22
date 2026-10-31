import { requireTenant } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { addMember, changeMemberRole, removeMember } from "./actions";

const msgs: Record<string, string> = {
  dados: "Informe um e-mail válido e o papel.",
  permissao: "Somente o proprietário pode gerenciar a equipe.",
  convite: "Não foi possível enviar o convite. O limite de e-mails do Supabase pode ter sido atingido; tente mais tarde.",
  "ja-membro": "Essa pessoa já faz parte da equipe.",
  proprio: "Não é possível alterar ou remover o proprietário nem a si mesmo.",
  convidado: "Convite enviado por e-mail. A pessoa define a senha ao abrir o link.",
  adicionado: "Pessoa adicionada à equipe (ela já tinha conta).",
  papel: "Papel atualizado.", removido: "Pessoa removida da equipe.",
};
const PAPEL: Record<string, string> = { owner: "Proprietário", manager: "Gerente", barber: "Barbeiro", customer: "Cliente" };

export default async function Equipe({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  const { supabase, tenantId, role, user } = await requireTenant();
  if (role !== "owner") return <p className="text-danger" role="alert">{msgs.permissao}</p>;
  const { data: members } = await supabase.from("memberships").select("id, user_id, role").eq("tenant_id", tenantId).order("created_at");
  const admin = createAdminClient();
  const emails = new Map<string, string>();
  await Promise.all((members ?? []).map(async (m) => {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    emails.set(m.user_id, data.user?.email ?? "(sem e-mail)");
  }));
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Equipe</h1>
      {(erro || ok) && <p role={erro ? "alert" : "status"} className={`mt-4 ${erro ? "text-danger" : "text-ok"}`}>{msgs[(erro ?? ok)!]}</p>}
      <form action={addMember} className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[2fr_1fr_auto]">
        <label className="text-sm">E-mail da pessoa<input className="field mt-1" name="email" type="email" required /></label>
        <label className="text-sm">Papel
          <select className="field mt-1" name="role" defaultValue="barber"><option value="barber">Barbeiro</option><option value="manager">Gerente</option></select>
        </label>
        <button className="btn self-end" type="submit">Convidar</button>
      </form>
      <p className="mt-2 text-sm text-muted">Barbeiros operam agenda e clientes. Gerentes também editam serviços e profissionais. Só o proprietário gerencia a equipe.</p>
      <ul className="mt-6 divide-y divide-line rounded-lg border border-line">
        {(members ?? []).map((m) => {
          const fixed = m.role === "owner" || m.user_id === user.id;
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div><p className="font-medium">{emails.get(m.user_id)}</p><p className="text-sm text-muted">{PAPEL[m.role]}{m.user_id === user.id ? " · você" : ""}</p></div>
              {!fixed && (
                <div className="flex gap-2">
                  <form action={changeMemberRole} className="flex gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <select className="field" name="role" defaultValue={m.role} aria-label="Papel"><option value="barber">Barbeiro</option><option value="manager">Gerente</option></select>
                    <button className="btn-ghost" type="submit">Salvar</button>
                  </form>
                  <form action={removeMember}><input type="hidden" name="id" value={m.id} /><button className="btn-ghost text-danger" type="submit">Remover</button></form>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
