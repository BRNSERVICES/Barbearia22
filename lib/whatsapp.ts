import { fmtDateLong, fmtTime, dateBR } from "./time";

export function confirmationMessage(a: { customer?: string | null; shop: string; service?: string | null; professional?: string | null; startsAt: string }) {
  const first = a.customer?.trim().split(/\s+/)[0];
  const quando = `${fmtDateLong(dateBR(a.startsAt))} às ${fmtTime(a.startsAt)}`;
  return [
    `Olá${first ? `, ${first}` : ""}! Seu horário na ${a.shop} está confirmado ✅`,
    "",
    `✂️ ${a.service ?? "Atendimento"}${a.professional ? ` com ${a.professional}` : ""}`,
    `📅 ${quando}`,
    "",
    "Te esperamos! Mais que um corte, é autoestima!",
  ].join("\n");
}
