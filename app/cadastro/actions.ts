"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createBarbershop } from "@/lib/onboarding";

const schema = z.object({
  shop: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(8),
});

export async function signup(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/cadastro?erro=dados");
  const { shop, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) redirect("/cadastro?erro=conta");
  try {
    await createBarbershop(data.user.id, shop);
  } catch {
    redirect("/cadastro?erro=barbearia");
  }
  // Sem sessão = o projeto exige confirmação de e-mail.
  redirect(data.session ? "/painel" : "/entrar?erro=confirme");
}
