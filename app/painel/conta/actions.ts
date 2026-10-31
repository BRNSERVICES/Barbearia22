"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenant } from "@/lib/session";

export async function changePassword(formData: FormData) {
  const parsed = z.object({ password: z.string().min(8).max(72), confirm: z.string() })
    .refine((d) => d.password === d.confirm).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/painel/conta?erro=dados");
  const { supabase } = await requireTenant();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect("/painel/conta?erro=falha");
  redirect("/painel/conta?ok=1");
}
