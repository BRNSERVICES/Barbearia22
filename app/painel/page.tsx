import Link from "next/link";
import { requireTenant, brl, canManage } from "@/lib/session";
import { NEEDS_CONFIRMATION } from "@/lib/status";
import { dayBounds, todayBR } from "@/lib/time";

export default async function Resumo() {
  const { supabase, tenantId, role } = await requireTenant();
  const hoje = todayBR();
  const { start, end } = dayBounds(hoje);
  const count = async (table: string, extra?: (q: any) => any) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    if (extra) q = extra(q);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [services, professionals, customers, today, pending, done] = await Promise.all([
    count("services", (q) => q.eq("is_active", true)),
    count("professionals", (q) => q.eq("is_active", true)),
    count("customers"),
    count("appointments", (q) => q.gte("starts_at", start).lt("starts_at", end).not("status", "in", "(cancelled,no_show)")),
    count("appointments", (q) => q.in("status", NEEDS_CONFIRMATION).gte("starts_at", start)),
    supabase.from("appointments").select("price_cents").eq("tenant_id", tenantId).eq("status", "completed")
      .gte("starts_at", start).lt("starts_at", end),
  ]);
  const revenue = (done.data ?? []).reduce((s, a) => s + a.price_cents, 0);
  // Cada card leva à tela correspondente. Financeiro é só para dono e gerente.
  const cards: { label: string; value: string; href: string | null; alert?: boolean }[] = [
    { label: "Atendimentos hoje", value: String(today), href: `/painel/agenda?vista=dia&dia=${hoje}` },
    { label: "Aguardando confirmação", value: String(pending), href: "/painel/agenda?vista=semana", alert: pending > 0 },
    { label: "Faturamento de hoje", value: brl(revenue), href: canManage(role) ? `/painel/financeiro?dia=${hoje}` : null },
    { label: "Clientes", value: String(customers), href: "/painel/clientes" },
    { label: "Profissionais ativos", value: String(professionals), href: "/painel/profissionais" },
    { label: "Serviços ativos", value: String(services), href: "/painel/servicos" },
  ];
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Resumo</h1>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const inner = (
            <>
              <dt className="text-sm text-muted">{c.label}</dt>
              <dd className="mt-1 font-display text-4xl font-bold">{c.value}</dd>
              {c.href && <span className="mt-2 block text-sm text-accent">Abrir →</span>}
            </>
          );
          const cls = `block rounded-lg border bg-surface p-5 ${c.alert ? "border-accent bg-accent/10" : "border-line"}`;
          return c.href ? (
            <Link key={c.label} href={c.href} className={`${cls} transition hover:border-accent hover:bg-surface2`}>{inner}</Link>
          ) : <div key={c.label} className={cls}>{inner}</div>;
        })}
      </dl>
    </>
  );
}
