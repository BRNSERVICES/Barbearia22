"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFreeSlots } from "@/lib/availability";
import { addDaysStr, isDateStr, todayBR } from "@/lib/time";

// Agendamento público: sem login. Usa chave de servidor, mas tudo é validado e limitado à barbearia do endereço.
export async function createPublicBooking(formData: FormData) {
  const slug = z.string().regex(/^[a-z0-9-]+$/).parse(formData.get("slug"));
  const parsed = z.object({
    prof: z.uuid(), serv: z.uuid(), dia: z.string().refine(isDateStr), start: z.iso.datetime(),
    name: z.string().trim().min(2).max(120),
    phone: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length >= 10 && v.length <= 13),
    consent: z.literal("on"),
    website: z.string().max(0), // campo-armadilha contra robôs
  }).safeParse(Object.fromEntries(formData));
  const back = (erro: string, extra: Record<string, string> = {}) => `/b/${slug}?${new URLSearchParams({ erro, ...extra })}`;
  if (!parsed.success) redirect(back("dados", ["prof", "serv", "dia"].reduce((o, k) => ({ ...o, [k]: String(formData.get(k) ?? "") }), {})));
  const d = parsed.data;
  const keep = { prof: d.prof, serv: d.serv, dia: d.dia };
  if (d.dia < todayBR() || d.dia > addDaysStr(todayBR(), 60)) redirect(back("data", keep));

  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!tenant) redirect("/");
  const tid = tenant.id as string;

  const [{ data: service }, { data: pro }, { data: link }] = await Promise.all([
    admin.from("services").select("price_cents, duration_min").eq("id", d.serv).eq("tenant_id", tid).eq("is_active", true).maybeSingle(),
    admin.from("professionals").select("id").eq("id", d.prof).eq("tenant_id", tid).eq("is_active", true).maybeSingle(),
    admin.from("professional_services").select("service_id").eq("professional_id", d.prof).eq("service_id", d.serv).eq("tenant_id", tid).maybeSingle(),
  ]);
  if (!service || !pro || !link) redirect(back("dados", keep));

  const free = await getFreeSlots(admin, tid, d.prof, d.dia, service.duration_min);
  const startsAt = new Date(d.start);
  if (!free.some((s) => s.startIso === startsAt.toISOString())) redirect(back("indisponivel", keep));

  // Cliente: reaproveita pelo WhatsApp ou cria.
  let customerId: string | undefined;
  const { data: existing } = await admin.from("customers").select("id").eq("tenant_id", tid).eq("whatsapp", d.phone).limit(1).maybeSingle();
  if (existing) customerId = existing.id;
  else {
    const { data: created } = await admin.from("customers")
      .insert({ tenant_id: tid, full_name: d.name, phone: d.phone, whatsapp: d.phone, marketing_consent: false }).select("id").single();
    customerId = created?.id;
  }
  if (!customerId) redirect(back("falha", keep));

  // Limite simples contra abuso: no máximo 3 pedidos futuros em aberto por cliente.
  const { count } = await admin.from("appointments").select("id", { count: "exact", head: true })
    .eq("tenant_id", tid).eq("customer_id", customerId).in("status", ["pending", "awaiting_confirmation", "confirmed"]).gte("starts_at", new Date().toISOString());
  if ((count ?? 0) >= 3) redirect(back("limite", keep));

  const { data: appt, error } = await admin.from("appointments").insert({
    tenant_id: tid, customer_id: customerId, professional_id: d.prof, service_id: d.serv,
    starts_at: startsAt.toISOString(), ends_at: new Date(startsAt.getTime() + service.duration_min * 60_000).toISOString(),
    price_cents: service.price_cents, status: "awaiting_confirmation", notes: "Agendado pela página pública",
  }).select("id").single();
  if (error || !appt) redirect(back(error?.code === "23P01" ? "indisponivel" : "falha", keep));
  redirect(`/b/${slug}/ok?id=${appt.id}`);
}
