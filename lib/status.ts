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
