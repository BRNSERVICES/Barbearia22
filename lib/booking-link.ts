export const bookingUrl = (origin: string, slug: string) => `${origin}/b/${slug}`;

export function bookingMessage(shop: string, url: string, customer?: string | null) {
  const first = customer?.trim().split(/\s+/)[0];
  return [
    `Olá${first ? `, ${first}` : ""}! Agende seu horário na ${shop} pelo link:`,
    url,
    "",
    "Mais que um corte, é autoestima!",
  ].join("\n");
}
