"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrigin } from "@/lib/origin";

const base = "/painel/equipe";
const staffRole = z.enum(["manager", "barber"]);

async function requireOwner() {
  const ctx = await requireTenant();
  if (ctx.role !== "owner") redirect(`${base}?erro=permissao`);
  return ctx;
}

export async function addMember(formData: FormData) {
  const parsed = z.object({ email: z.email().transform((v) => v.toLowerCase()), role: staffRole }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${base}?erro=dados`);
  const { supabase, tenantId } = await requireOwner();
  const admin = createAdminClient();
  const origin = await getOrigin();

  // Convida por e-mail; se a pessoa já tem conta, apenas localiza o usuário.
  let userId: string | undefined;
  const invite = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/painel/conta?recuperar=1")}`,
  });
  if (invite.data?.user) userId = invite.data.user.id;
  else {
    const list = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = list.data?.users.find((u) => u.email?.toLowerCase() === parsed.data.email)?.id;
  }
  if (!userId) redirect(`${base}?erro=convite`);

  const { error } = await supabase.from("memberships").insert({ tenant_id: tenantId, user_id: userId, role: parsed.data.role });
  if (error) redirect(`${base}?erro=${error.code === "23505" ? "ja-membro" : "permissao"}`);
  revalidatePath(base);
  redirect(`${base}?ok=${invite.data?.user ? "convidado" : "adicionado"}`);
}

export async function changeMemberRole(formData: FormData) {
  const parsed = z.object({ id: z.uuid(), role: staffRole }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${base}?erro=dados`);
  const { supabase, tenantId, user } = await requireOwner();
  const { data: target } = await supabase.from("memberships").select("user_id, role").eq("id", parsed.data.id).eq("tenant_id", tenantId).maybeSingle();
  if (!target || target.user_id === user.id || target.role === "owner") redirect(`${base}?erro=proprio`);
  const { error } = await supabase.from("memberships").update({ role: parsed.data.role }).eq("id", parsed.data.id).eq("tenant_id", tenantId);
  if (error) redirect(`${base}?erro=permissao`);
  revalidatePath(base);
  redirect(`${base}?ok=papel`);
}

export async function removeMember(formData: FormData) {
  const id = z.uuid().parse(formData.get("id"));
  const { supabase, tenantId, user } = await requireOwner();
  const { data: target } = await supabase.from("memberships").select("user_id, role").eq("id", id).eq("tenant_id", tenantId).maybeSingle();
  if (!target || target.user_id === user.id || target.role === "owner") redirect(`${base}?erro=proprio`);
  const { error } = await supabase.from("memberships").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) redirect(`${base}?erro=permissao`);
  revalidatePath(base);
  redirect(`${base}?ok=removido`);
}
