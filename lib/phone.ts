// WhatsApp guardado só com dígitos (DDD + número, com ou sem 55) para evitar cliente duplicado.
export const digitsOnly = (v: string) => v.replace(/\D/g, "");
export const isValidPhone = (v: string) => {
  const n = digitsOnly(v).length;
  return n >= 10 && n <= 13;
};
export function formatPhone(v: string | null) {
  if (!v) return "—";
  let d = digitsOnly(v);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
}

// Link wa.me com a mensagem já escrita. Aceita número com ou sem 55; devolve null se não houver número válido.
export function waLink(phone: string | null | undefined, text: string) {
  if (!phone) return null;
  let d = digitsOnly(phone);
  if (d.length < 10) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
