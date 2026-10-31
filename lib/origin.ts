import { headers } from "next/headers";

// Endereço público do site (a Vercel envia host e protocolo nos cabeçalhos).
export async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
