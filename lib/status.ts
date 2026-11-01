export const STATUS_LABEL = {
  pending: "Pendente",
  awaiting_confirmation: "Aguardando confirmação",
  confirmed: "Confirmado",
  in_service: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
} as const;
export type Status = keyof typeof STATUS_LABEL;
export const STATUS_KEYS = Object.keys(STATUS_LABEL) as [Status, ...Status[]];

// Pedidos que ainda precisam de uma resposta da barbearia.
export const NEEDS_CONFIRMATION: Status[] = ["awaiting_confirmation", "pending"];
export const needsConfirmation = (s: Status) => NEEDS_CONFIRMATION.includes(s);
export const INACTIVE: Status[] = ["cancelled", "no_show"];
