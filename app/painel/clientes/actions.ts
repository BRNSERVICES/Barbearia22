"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant, canOperate, canManage } from "@/lib/session";
import { digitsOnly, isValidPhone } from "@/lib/phone";

const base = "/painel/clientes";
const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  whatsapp: z.string().refine(isValidPhone).transform(digitsOnly),
});

export async function createCustomer(formData: FormData) {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${base}?erro=dados`);
  const { supabase, tenantId, role } = await requireTenant();
  if (!canOperate(role)) redirect(`${base}?erro=permissao`);
  const d = parsed.data;
  const { error } = await supabase.from("customers").insert({
    tenant_id: tenantId, full_name: d.name, phone: d.whatsapp, whatsapp: d.whatsapp,
  });
  if (error) redirect(`${base}?erro=permissao`);
  revalidatePath(base);
  redirect(`${base}?ok=criado`);
}

export async function updateCustomer(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const back = `${base}/${id}`;
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${back}?erro=dados`);
  const { supabase, tenantId, role } = await requireTenant();
  if (!canOperate(role)) redirect(`${back}?erro=permissao`);
  const d = parsed.data;
  const { error } = await supabase.from("customers").update({
    full_name: d.name, phone: d.whatsapp, whatsapp: d.whatsapp,
  }).eq("id", id).eq("tenant_id", tenantId);
  if (error) redirect(`${back}?erro=permissao`);
  revalidatePath(back);
  redirect(`${back}?ok=salvo`);
}

export async function deleteCustomer(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const { supabase, tenantId, role, user } = await requireTenant();
  if (!canManage(role)) redirect(`${base}?erro=permissao`);
  // Administrador pode excluir mesmo com agendamentos: o histórico do cliente é apagado junto.
  const { data: removed, error: apErr } = await supabase.from("appointments").delete().eq("customer_id", id).eq("tenant_id", tenantId).select("id");
  if (apErr) redirect(`${base}?erro=permissao`);
  const { data: gone, error } = await supabase.from("customers").delete().eq("id", id).eq("tenant_id", tenantId).select("id");
  if (error || !gone?.length) redirect(`${base}?erro=permissao`);
  await supabase.from("audit_logs").insert({ tenant_id: tenantId, user_id: user.id, action: `delete:appointments=${removed?.length ?? 0}`, entity: "customer", entity_id: id });
  revalidatePath(base);
  revalidatePath("/painel/agenda");
  redirect(`${base}?ok=excluido`);
}
