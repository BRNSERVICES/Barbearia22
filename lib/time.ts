// Brasil (Brasília) sem horário de verão: UTC-3. Todo horário de agenda é tratado neste fuso,
// independente do fuso do servidor (a Vercel roda em UTC).
export const TZ = "America/Sao_Paulo";
const OFFSET = "-03:00";
const ymd = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ });

export const todayBR = () => ymd.format(new Date());
export const isDateStr = (s?: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00${OFFSET}`));
export const toISO = (date: string, hhmm: string) => new Date(`${date}T${hhmm.slice(0, 5)}:00${OFFSET}`).toISOString();
export const dayBounds = (date: string) => {
  const start = toISO(date, "00:00");
  return { start, end: new Date(new Date(start).getTime() + 86_400_000).toISOString() };
};
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00${OFFSET}`).getUTCDay();
export const addDaysStr = (date: string, n: number) =>
  ymd.format(new Date(new Date(`${date}T12:00:00${OFFSET}`).getTime() + n * 86_400_000));
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const fmtDateLong = (date: string) =>
  new Date(`${date}T12:00:00${OFFSET}`).toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long", day: "2-digit", month: "long" });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
