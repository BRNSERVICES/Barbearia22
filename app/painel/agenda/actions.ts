"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant, canOperate } from "@/lib/session";
import { getFreeSlots } from "@/lib/availability";
import { STATUS_KEYS } from "@/lib/status";
import { isDateStr } from "@/lib/time";

const url = (dia: string, extra: Record<string, string> = {}) => `/painel/agenda?${new URLSearchParams({ dia, ...extra })}`;

export async function createAppointment(formData: FormData) {
  const parsed = z.object({
    customer: z.uuid(), prof: z.uuid(), serv: z.uuid(), dia: z.string().refine(isDateStr), start: z.iso.datetime(),
    notes: z.string().trim().max(1000).optional(),
  }).safeParse(Object.fromEntries(formData));
  const dia = String(formData.get("dia") ?? "");
  if (!parsed.success) redirect(isDateStr(dia) ? url(dia, { erro: "dados" }) : "/painel/agenda?erro=dados");
  const { customer, prof, serv, start, notes } = parsed.data;
  const { supabase, tenantId, role, user } = await requireTenant();
  const back = (erro: string) => url(parsed.data.dia, { erro, prof, serv });
  if (!canOperate(role)) redirect(back("permissao"));

  const [{ data: service }, { data: link }] = await Promise.all([
    supabase.from("services").select("price_cents, duration_min, is_active").eq("id", serv).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("professional_services").select("service_id").eq("professional_id", prof).eq("service_id", serv).eq("tenant_id", tenantId).maybeSingle(),
  ]);
  if (!service?.is_active) redirect(back("servico"));
  if (!link) redirect(back("nao-executa"));

  // Revalida o horário no servidor: jornada + atendimentos ativos (o banco ainda barra qualquer corrida).
  const free = await getFreeSlots(supabase, tenantId, prof, parsed.data.dia, service.duration_min);
  if (!free.some((s) => s.startIso === new Date(start).toISOString())) redirect(back("indisponivel"));

  const startsAt = new Date(start);
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);
  const { data, error } = await supabase.from("appointments").insert({
    tenant_id: tenantId, customer_id: customer, professional_id: prof, service_id: serv,
    starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), price_cents: service.price_cents,
    status: "confirmed", notes: notes || null,
  }).select("id").single();
  if (error || !data) redirect(back(error?.code === "23P01" ? "indisponivel" : "permissao"));
  await supabase.from("audit_logs").insert({ tenant_id: tenantId, user_id: user.id, action: "create", entity: "appointment", entity_id: data.id });
  revalidatePath("/painel/agenda");
  redirect(url(parsed.data.dia, { ok: "criado", prof, serv }));
}

export async function setAppointmentStatus(formData: FormData) {
  const parsed = z.object({ id: z.uuid(), status: z.enum(STATUS_KEYS), dia: z.string().refine(isDateStr) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/painel/agenda?erro=dados");
  const { id, status, dia } = parsed.data;
  const { supabase, tenantId, role, user } = await requireTenant();
  if (!canOperate(role)) redirect(url(dia, { erro: "permissao" }));
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id).eq("tenant_id", tenantId);
  // Reativar um atendimento cancelado pode conflitar com outro marcado no mesmo horário.
  if (error) redirect(url(dia, { erro: error.code === "23P01" ? "indisponivel" : "permissao" }));
  await supabase.from("audit_logs").insert({ tenant_id: tenantId, user_id: user.id, action: `status:${status}`, entity: "appointment", entity_id: id });
  revalidatePath("/painel/agenda");
  redirect(url(dia, { ok: "status" }));
}
