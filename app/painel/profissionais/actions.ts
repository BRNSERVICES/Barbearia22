"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant, canManage } from "@/lib/session";

const base = "/painel/profissionais";

export async function createProfessional(formData: FormData) {
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    commission: z.coerce.number().min(0).max(100),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${base}?erro=dados`);
  const { supabase, tenantId, role } = await requireTenant();
  if (!canManage(role)) redirect(`${base}?erro=permissao`);
  const { data, error } = await supabase.from("professionals")
    .insert({ tenant_id: tenantId, display_name: parsed.data.name, commission_pct: parsed.data.commission })
    .select("id").single();
  if (error || !data) redirect(`${base}?erro=permissao`);
  redirect(`${base}/${data.id}?ok=criado`);
}

export async function toggleProfessional(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";
  const { supabase, tenantId, role } = await requireTenant();
  if (!canManage(role)) redirect(`${base}?erro=permissao`);
  const { error } = await supabase.from("professionals").update({ is_active: !active }).eq("id", id).eq("tenant_id", tenantId);
  if (error) redirect(`${base}?erro=permissao`);
  revalidatePath(base);
}

export async function deleteProfessional(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const { supabase, tenantId, role } = await requireTenant();
  if (!canManage(role)) redirect(`${base}?erro=permissao`);
  const { error } = await supabase.from("professionals").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) redirect(`${base}?erro=${error.code === "23503" ? "em-uso" : "permissao"}`);
  revalidatePath(base);
  redirect(`${base}?ok=excluido`);
}

export async function saveProfessionalDetails(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    commission: z.coerce.number().min(0).max(100),
  }).safeParse(Object.fromEntries(formData));
  const back = `${base}/${id}`;
  if (!parsed.success) redirect(`${back}?erro=dados`);
  const { supabase, tenantId, role } = await requireTenant();
  if (!canManage(role)) redirect(`${back}?erro=permissao`);
  const { error } = await supabase.from("professionals")
    .update({ display_name: parsed.data.name, commission_pct: parsed.data.commission }).eq("id", id).eq("tenant_id", tenantId);
  if (error) redirect(`${back}?erro=permissao`);
  revalidatePath(back);
  redirect(`${back}?ok=salvo`);
}

export async function saveProfessionalServices(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const serviceIds = z.array(z.uuid()).parse(formData.getAll("service"));
  const back = `${base}/${id}`;
  const { supabase, tenantId, role } = await requireTenant();
  if (!canManage(role)) redirect(`${back}?erro=permissao`);
  const del = await supabase.from("professional_services").delete().eq("professional_id", id).eq("tenant_id", tenantId);
  if (del.error) redirect(`${back}?erro=permissao`);
  if (serviceIds.length) {
    const ins = await supabase.from("professional_services")
      .insert(serviceIds.map((service_id) => ({ tenant_id: tenantId, professional_id: id, service_id })));
    if (ins.error) redirect(`${back}?erro=permissao`);
  }
  revalidatePath(back);
  redirect(`${back}?ok=servicos`);
}

export async function saveWorkingHours(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const back = `${base}/${id}`;
  const time = z.string().regex(/^\d{2}:\d{2}$/);
  const rows: { weekday: number; start_time: string; end_time: string }[] = [];
  for (let d = 0; d < 7; d++) {
    if (formData.get(`on_${d}`) !== "on") continue;
    const s = time.safeParse(formData.get(`start_${d}`));
    const e = time.safeParse(formData.get(`end_${d}`));
    if (!s.success || !e.success || e.data <= s.data) redirect(`${back}?erro=horario`);
    rows.push({ weekday: d, start_time: s.data, end_time: e.data });
  }
  const { supabase, tenantId, role } = await requireTenant();
  if (!canManage(role)) redirect(`${back}?erro=permissao`);
  const del = await supabase.from("working_hours").delete().eq("professional_id", id).eq("tenant_id", tenantId);
  if (del.error) redirect(`${back}?erro=permissao`);
  if (rows.length) {
    const ins = await supabase.from("working_hours")
      .insert(rows.map((r) => ({ ...r, tenant_id: tenantId, professional_id: id })));
    if (ins.error) redirect(`${back}?erro=permissao`);
  }
  revalidatePath(back);
  redirect(`${back}?ok=jornada`);
}
