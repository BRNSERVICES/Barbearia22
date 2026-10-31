import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Cria barbearia, unidade principal, vínculo de dono e categorias iniciais.
export async function createBarbershop(userId: string, name: string) {
  const admin = createAdminClient();
  const base = slugify(name) || "barbearia";
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: tenant, error } = await admin.from("tenants").insert({ name, slug }).select("id").single();
    if (error?.code === "23505") continue; // slug já existe
    if (error || !tenant) throw new Error("Não foi possível criar a barbearia.");
    const results = await Promise.all([
      admin.from("memberships").insert({ tenant_id: tenant.id, user_id: userId, role: "owner" }),
      admin.from("branches").insert({ tenant_id: tenant.id, name: "Unidade principal" }),
      admin.from("categories").insert(["Cabelo", "Barba", "Combos"].map((n) => ({ tenant_id: tenant.id, name: n, kind: "service" }))),
    ]);
    if (results.some((r) => r.error)) {
      await admin.from("tenants").delete().eq("id", tenant.id); // desfaz criação parcial
      throw new Error("Não foi possível concluir o cadastro da barbearia.");
    }
    return tenant.id as string;
  }
  throw new Error("Não foi possível gerar um endereço único para a barbearia.");
}
