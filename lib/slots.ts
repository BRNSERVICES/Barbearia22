import { toISO, TZ } from "./time";

export type Busy = { starts_at: string; ends_at: string };
export type Slot = { hhmm: string; startIso: string };

// Horários livres de um profissional em um dia: dentro da jornada, sem sobrepor atendimentos e sem passado.
export function computeSlots(opts: {
  date: string; start: string; end: string; durationMin: number; busy: Busy[];
  breakStart?: string | null; breakEnd?: string | null; now?: Date; stepMin?: number;
}): Slot[] {
  const { date, durationMin, busy } = opts;
  const step = (opts.stepMin ?? 15) * 60_000;
  const now = (opts.now ?? new Date()).getTime();
  const dur = durationMin * 60_000;
  const open = new Date(toISO(date, opts.start)).getTime();
  const close = new Date(toISO(date, opts.end)).getTime();
  const blocks = busy.map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as const);
  if (opts.breakStart && opts.breakEnd) {
    blocks.push([new Date(toISO(date, opts.breakStart)).getTime(), new Date(toISO(date, opts.breakEnd)).getTime()]);
  }
  const out: Slot[] = [];
  for (let t = open; t + dur <= close; t += step) {
    if (t < now) continue;
    if (blocks.some(([bs, be]) => t < be && t + dur > bs)) continue;
    out.push({
      hhmm: new Date(t).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }),
      startIso: new Date(t).toISOString(),
    });
  }
  return out;
}
