import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com chave secreta: ignora RLS. Use só em código de servidor e só onde a regra de negócio exigir.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
