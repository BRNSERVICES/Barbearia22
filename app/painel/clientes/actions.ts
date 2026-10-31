"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant, canOperate, canManage } from "@/lib/session";

const base = "/painel/clientes";
const opt = (max: number) => z.string().trim().max(max).transform((v) => v || null).optional().transform((v) => v ?? null);
const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: opt(20), whatsapp: opt(20),
  email: z.union([z.literal(""), z.email()]).transform((v) => v || null),
  birth: z.union([z.literal(""), z.iso.date()]).transform((v) => v || null),
  notes: opt(1000),
});

export async function createCustomer(formData: FormData) {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${base}?erro=dados`);
  const { supabase, tenantId, role } = await requireTenant();
  if (!canOperate(role)) redirect(`${base}?erro=permissao`);
  const d = parsed.data;
  const { error } = await supabase.from("customers").insert({
    tenant_id: tenantId, full_name: d.name, phone: d.phone, whatsapp: d.whatsapp, email: d.email, birth_date: d.birth, notes: d.notes,
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
    full_name: d.name, phone: d.phone, whatsapp: d.whatsapp, email: d.email, birth_date: d.birth, notes: d.notes,
  }).eq("id", id).eq("tenant_id", tenantId);
  if (error) redirect(`${back}?erro=permissao`);
  revalidatePath(back);
  redirect(`${back}?ok=salvo`);
}

export async function deleteCustomer(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const { supabase, tenantId, role } = await requireTenant();
  if (!canManage(role)) redirect(`${base}?erro=permissao`);
  const { error } = await supabase.from("customers").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) redirect(`${base}?erro=${error.code === "23503" ? "em-uso" : "permissao"}`);
  revalidatePath(base);
  redirect(`${base}?ok=excluido`);
}
