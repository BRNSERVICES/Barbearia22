import { requireTenant, canManage } from "@/lib/session";
import { commissionOf, type FinRow } from "@/lib/finance";
import { dayBounds, fmtTime, isDateStr, todayBR } from "@/lib/time";

// Evita que uma célula comece com = + - @ e vire fórmula ao abrir no Excel.
const cell = (v: string) => {
  const t = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${t.replace(/"/g, '""')}"`;
};
const money = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export async function GET(req: Request) {
  const dia0 = new URL(req.url).searchParams.get("dia");
  const dia = isDateStr(dia0) ? dia0 : todayBR();
  const { supabase, tenantId, role } = await requireTenant();
  if (!canManage(role)) return new Response("Sem permissão", { status: 403 });
  const { start, end } = dayBounds(dia);
  const { data } = await supabase.from("appointments")
    .select("id, starts_at, status, price_cents, customers(full_name), professionals(display_name, commission_pct), services(name)")
    .eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", start).lt("starts_at", end).order("starts_at");
  const rows = (data ?? []) as unknown as FinRow[];
  const lines = [["Hora", "Cliente", "Serviço", "Profissional", "Valor (R$)", "Comissão (R$)"].map(cell).join(";")];
  for (const r of rows) {
    lines.push([fmtTime(r.starts_at), r.customers?.full_name ?? "", r.services?.name ?? "", r.professionals?.display_name ?? "", money(r.price_cents), money(commissionOf(r))].map(cell).join(";"));
  }
  lines.push(["Total", "", "", "", money(rows.reduce((s, r) => s + r.price_cents, 0)), money(rows.reduce((s, r) => s + commissionOf(r), 0))].map(cell).join(";"));
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="financeiro-${dia}.csv"`, "Cache-Control": "no-store" },
  });
}
