import { requireTenant, brl } from "@/lib/session";
import { dayBounds, todayBR } from "@/lib/time";

export default async function Resumo() {
  const { supabase, tenantId } = await requireTenant();
  const { start, end } = dayBounds(todayBR());
  const count = async (table: string, extra?: (q: any) => any) => {
    let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    if (extra) q = extra(q);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [services, professionals, customers, today, done] = await Promise.all([
    count("services", (q) => q.eq("is_active", true)),
    count("professionals", (q) => q.eq("is_active", true)),
    count("customers"),
    count("appointments", (q) => q.gte("starts_at", start).lt("starts_at", end).not("status", "in", "(cancelled,no_show)")),
    supabase.from("appointments").select("price_cents").eq("tenant_id", tenantId).eq("status", "completed")
      .gte("starts_at", start).lt("starts_at", end),
  ]);
  const revenue = (done.data ?? []).reduce((s, a) => s + a.price_cents, 0);
  const cards = [
    ["Atendimentos hoje", String(today)],
    ["Faturamento de hoje", brl(revenue)],
    ["Clientes", String(customers)],
    ["Profissionais ativos", String(professionals)],
    ["Serviços ativos", String(services)],
  ];
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Resumo</h1>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-surface p-5">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-1 font-display text-4xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
