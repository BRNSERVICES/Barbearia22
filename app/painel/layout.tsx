import Link from "next/link";
import { requireTenant } from "@/lib/session";
import { logout } from "../entrar/actions";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { tenant, user, role } = await requireTenant();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-line bg-surface p-4 md:w-60 md:border-b-0 md:border-r">
        <p className="font-display text-2xl font-extrabold text-accent">{tenant.name}</p>
        <nav className="mt-4 flex flex-wrap gap-2 md:flex-col" aria-label="Principal">
          <Link className="rounded px-3 py-2 hover:bg-surface2" href="/painel">Resumo</Link>
          <Link className="rounded px-3 py-2 hover:bg-surface2" href="/painel/agenda">Agenda</Link>
          <Link className="rounded px-3 py-2 hover:bg-surface2" href="/painel/clientes">Clientes</Link>
          <Link className="rounded px-3 py-2 hover:bg-surface2" href="/painel/profissionais">Profissionais</Link>
          <Link className="rounded px-3 py-2 hover:bg-surface2" href="/painel/servicos">Serviços</Link>
          {role === "owner" && <Link className="rounded px-3 py-2 hover:bg-surface2" href="/painel/equipe">Equipe</Link>}
          <Link className="rounded px-3 py-2 hover:bg-surface2" href="/painel/conta">Minha conta</Link>
        </nav>
        <form action={logout} className="mt-4 md:mt-8">
          <p className="mb-2 truncate text-xs text-muted">{user.email}</p>
          <button className="btn-ghost w-full" type="submit">Sair</button>
        </form>
      </aside>
      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
