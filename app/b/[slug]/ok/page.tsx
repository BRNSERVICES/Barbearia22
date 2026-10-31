import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtDateTime } from "@/lib/time";

export const metadata = { robots: { index: false } };

export default async function Ok({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ id?: string }> }) {
  const [{ slug }, { id }] = await Promise.all([params, searchParams]);
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) notFound();
  const admin = createAdminClient();
  // Mostra só dados do serviço e do horário, nunca dados do cliente.
  const { data } = await admin.from("appointments")
    .select("starts_at, services(name), professionals(display_name), tenants(slug, name)").eq("id", parsed.data).maybeSingle();
  const a = data as unknown as { starts_at: string; services: { name: string } | null; professionals: { display_name: string } | null; tenants: { slug: string; name: string } | null } | null;
  if (!a || a.tenants?.slug !== slug) notFound();
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="font-display text-xl text-accent">{a.tenants?.name}</p>
      <h1 className="font-display text-5xl font-extrabold leading-none">Pedido recebido</h1>
      <p className="mt-6 text-lg">{a.services?.name} com {a.professionals?.display_name}</p>
      <p className="font-display text-3xl font-bold">{fmtDateTime(a.starts_at)}</p>
      <p className="mt-4 text-muted">A barbearia vai confirmar o seu horário pelo WhatsApp. Até lá, ele fica reservado para você.</p>
      <Link className="btn-ghost mt-8 inline-block" href={`/b/${slug}`}>Fazer outro agendamento</Link>
    </main>
  );
}
