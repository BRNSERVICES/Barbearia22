"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/origin";

export async function requestReset(formData: FormData) {
  const parsed = z.object({ email: z.email() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/esqueci?erro=dados");
  const supabase = await createClient();
  const origin = await getOrigin();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/painel/conta?recuperar=1")}`,
  });
  // Resposta igual exista ou não a conta, para não revelar quem é cliente.
  redirect("/esqueci?ok=1");
}
