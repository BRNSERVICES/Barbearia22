"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/session";

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  price: z.coerce.number().min(0).max(100000),
  duration: z.coerce.number().int().min(5).max(480),
});

export async function createService(formData: FormData) {
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/painel/servicos?erro=dados");
  const { supabase, tenantId, user } = await requireTenant();
  const { data, error } = await supabase.from("services").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    price_cents: Math.round(parsed.data.price * 100),
    duration_min: parsed.data.duration,
  }).select("id").single();
  if (error) redirect(`/painel/servicos?erro=${error.code === "23505" ? "duplicado" : "permissao"}`);
  await supabase.from("audit_logs").insert({ tenant_id: tenantId, user_id: user.id, action: "create", entity: "service", entity_id: data.id });
  revalidatePath("/painel/servicos");
  redirect("/painel/servicos?ok=criado");
}

export async function toggleService(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const active = formData.get("active") === "true";
  const { supabase, tenantId, user } = await requireTenant();
  const { error } = await supabase.from("services").update({ is_active: !active }).eq("id", id).eq("tenant_id", tenantId);
  if (error) redirect("/painel/servicos?erro=permissao");
  await supabase.from("audit_logs").insert({ tenant_id: tenantId, user_id: user.id, action: "update", entity: "service", entity_id: id });
  revalidatePath("/painel/servicos");
}

export async function deleteService(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const { supabase, tenantId, user } = await requireTenant();
  const { error } = await supabase.from("services").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) redirect(`/painel/servicos?erro=${error.code === "23503" ? "em-uso" : "permissao"}`);
  await supabase.from("audit_logs").insert({ tenant_id: tenantId, user_id: user.id, action: "delete", entity: "service", entity_id: id });
  revalidatePath("/painel/servicos");
  redirect("/painel/servicos?ok=excluido");
}
