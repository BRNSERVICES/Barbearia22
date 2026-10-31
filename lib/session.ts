import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "owner" | "manager" | "barber" | "customer";

// Usuário logado + barbearia (tenant) em que ele atua. A autorização real é feita pelo RLS no banco.
export async function requireTenant() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: membership } = await supabase
    .from("memberships")
    .select("role, tenant_id, tenants(name, slug)")
    .eq("user_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/entrar?erro=sem-barbearia");
  const tenant = membership.tenants as unknown as { name: string; slug: string };
  return { supabase, user, tenantId: membership.tenant_id as string, role: membership.role as AppRole, tenant };
}

export const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const canManage = (role: AppRole) => role === "owner" || role === "manager";
export const canOperate = (role: AppRole) => role !== "customer";
