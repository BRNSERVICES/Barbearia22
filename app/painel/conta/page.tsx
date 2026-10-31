import { requireTenant } from "@/lib/session";
import { changePassword } from "./actions";

export default async function Conta({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string; recuperar?: string }> }) {
  const { erro, ok, recuperar } = await searchParams;
  const { user, role } = await requireTenant();
  const papel = { owner: "Proprietário", manager: "Gerente", barber: "Barbeiro", customer: "Cliente" }[role];
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Minha conta</h1>
      <p className="mt-2 text-muted">{user.email} · {papel}</p>
      {recuperar && !ok && <p role="status" className="mt-4 text-ok">Defina agora a sua nova senha.</p>}
      {erro && <p role="alert" className="mt-4 text-danger">{erro === "dados" ? "A senha precisa ter de 8 a 72 caracteres e as duas digitações devem ser iguais." : "Não foi possível trocar a senha. Tente de novo."}</p>}
      {ok && <p role="status" className="mt-4 text-ok">Senha alterada.</p>}
      <form action={changePassword} className="mt-6 max-w-sm space-y-4 rounded-lg border border-line bg-surface p-4">
        <label className="block text-sm">Nova senha
          <input className="field mt-1" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        </label>
        <label className="block text-sm">Repita a nova senha
          <input className="field mt-1" name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        </label>
        <button className="btn" type="submit">Trocar senha</button>
      </form>
    </>
  );
}
