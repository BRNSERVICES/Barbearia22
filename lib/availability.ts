import type { SupabaseClient } from "@supabase/supabase-js";
import { computeSlots, type Slot } from "./slots";
import { dayBounds, weekdayOf } from "./time";

// Horários livres reais: jornada do profissional no dia da semana menos atendimentos ativos.
export async function getFreeSlots(
  supabase: SupabaseClient, tenantId: string, professionalId: string, date: string, durationMin: number,
): Promise<Slot[]> {
  const { start, end } = dayBounds(date);
  const [{ data: wh }, { data: busy }] = await Promise.all([
    supabase.from("working_hours").select("start_time, end_time")
      .eq("tenant_id", tenantId).eq("professional_id", professionalId).eq("weekday", weekdayOf(date)).maybeSingle(),
    supabase.from("appointments").select("starts_at, ends_at")
      .eq("tenant_id", tenantId).eq("professional_id", professionalId)
      .gte("starts_at", start).lt("starts_at", end).not("status", "in", "(cancelled,no_show)"),
  ]);
  if (!wh) return [];
  return computeSlots({ date, start: wh.start_time, end: wh.end_time, durationMin, busy: busy ?? [] });
}
