import Link from "next/link";
import { INACTIVE, needsConfirmation, STATUS_LABEL, type Status } from "@/lib/status";
import { addDaysStr, dateBR, dayNum, fmtShort, fmtTime, todayBR, WEEKDAYS_SHORT } from "@/lib/time";

export type Row = {
  id: string; starts_at: string; ends_at: string; status: Status; price_cents: number; notes: string | null;
  customers: { full_name: string; whatsapp: string | null } | null;
  professionals: { display_name: string } | null;
  services: { name: string } | null;
};

export const TONE: Record<Status, string> = {
  awaiting_confirmation: "border-accent bg-accent/15",
  pending: "border-accent bg-accent/15",
  confirmed: "border-ok bg-ok/10",
  in_service: "border-ink bg-surface2",
  completed: "border-line bg-surface2 text-muted",
  cancelled: "border-line text-muted line-through opacity-60",
  no_show: "border-line text-muted line-through opacity-60",
};

const firstName = (n?: string) => n?.trim().split(/\s+/)[0] ?? "Cliente";

export function groupByDay(rows: Row[]) {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const d = dateBR(r.starts_at);
    map.set(d, [...(map.get(d) ?? []), r]);
  }
  return map;
}

export function Legend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legenda">
      <li className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm border-l-4 border-accent bg-accent/15" />Aguardando confirmação</li>
      <li className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm border-l-4 border-ok bg-ok/10" />Confirmado</li>
      <li className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm border-l-4 border-line bg-surface2" />Concluído / cancelado</li>
    </ul>
  );
}

export function WeekView({ start, byDay, href }: { start: string; byDay: Map<string, Row[]>; href: (d: string) => string }) {
  const today = todayBR();
  const days = Array.from({ length: 7 }, (_, i) => addDaysStr(start, i));
  return (
    <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-7">
      {days.map((d, i) => {
        const items = byDay.get(d) ?? [];
        const active = items.filter((r) => !INACTIVE.includes(r.status));
        const pend = items.filter((r) => needsConfirmation(r.status)).length;
        return (
          <section key={d} aria-label={`${WEEKDAYS_SHORT[i]} ${fmtShort(d)}`}
            className={`rounded-lg border bg-surface p-2 ${d === today ? "border-accent" : "border-line"}`}>
            <Link href={href(d)} className="flex items-baseline justify-between rounded px-1 py-1 hover:bg-surface2">
              <span className="font-display text-lg font-bold">{WEEKDAYS_SHORT[i]} <span className={d === today ? "text-accent" : ""}>{dayNum(d)}</span></span>
              <span className="text-xs text-muted">{active.length ? `${active.length} atend.` : "livre"}</span>
            </Link>
            {pend > 0 && <p className="mx-1 mb-1 rounded bg-accent px-2 py-0.5 text-xs font-bold text-accentink">{pend} a confirmar</p>}
            <ul className="space-y-1">
              {items.map((r) => (
                <li key={r.id}>
                  <Link href={href(d)} title={`${STATUS_LABEL[r.status]} · ${r.services?.name ?? ""} com ${r.professionals?.display_name ?? ""}`}
                    className={`block rounded border-l-4 px-2 py-1 text-xs hover:brightness-110 ${TONE[r.status]}`}>
                    <span className="font-bold">{fmtTime(r.starts_at)}</span> {firstName(r.customers?.full_name)}
                    <span className="block truncate text-muted">{r.services?.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function MonthView({ first, byDay, href }: { first: string; byDay: Map<string, Row[]>; href: (d: string) => string }) {
  const today = todayBR();
  const lead = new Date(`${first}T12:00:00-03:00`).getUTCDay();
  const gridStart = addDaysStr(first, -lead);
  const cells = Array.from({ length: 42 }, (_, i) => addDaysStr(gridStart, i));
  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted" aria-hidden="true">
        {WEEKDAYS_SHORT.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const items = (byDay.get(d) ?? []).filter((r) => !INACTIVE.includes(r.status));
          const pend = items.filter((r) => needsConfirmation(r.status)).length;
          const inMonth = d.slice(0, 7) === first.slice(0, 7);
          return (
            <Link key={d} href={href(d)} aria-label={`${fmtShort(d)}: ${items.length} atendimentos${pend ? `, ${pend} a confirmar` : ""}`}
              className={`flex min-h-16 flex-col rounded-lg border bg-surface p-1.5 text-left transition hover:border-accent hover:bg-surface2 md:min-h-28 ${d === today ? "border-accent" : "border-line"} ${inMonth ? "" : "opacity-40"}`}>
              <span className={`text-sm font-bold ${d === today ? "text-accent" : ""}`}>{dayNum(d)}</span>
              {pend > 0 && <span className="mt-0.5 rounded bg-accent px-1 text-[11px] font-bold text-accentink">{pend}<span className="hidden md:inline"> a confirmar</span></span>}
              {items.length > 0 && <span className="mt-0.5 text-[11px] text-muted md:hidden">{items.length} atend.</span>}
              <span className="hidden md:block">
                {items.slice(0, 3).map((r) => (
                  <span key={r.id} className={`mt-0.5 block truncate rounded border-l-2 px-1 text-[11px] ${TONE[r.status]}`}>{fmtTime(r.starts_at)} {firstName(r.customers?.full_name)}</span>
                ))}
                {items.length > 3 && <span className="mt-0.5 block text-[11px] text-muted">+{items.length - 3} mais</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
