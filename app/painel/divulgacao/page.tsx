import Link from "next/link";
import QRCode from "qrcode";
import { requireTenant } from "@/lib/session";
import { getOrigin } from "@/lib/origin";
import { bookingMessage, bookingUrl } from "@/lib/booking-link";
import { formatPhone, waLink } from "@/lib/phone";
import { CopyButton } from "./botoes";

export default async function Divulgacao({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const { supabase, tenantId, tenant } = await requireTenant();
  const url = bookingUrl(await getOrigin(), tenant.slug);
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#000000", light: "#ffffff" } });
  const term = q.trim().replace(/[%,()]/g, "");
  let query = supabase.from("customers").select("id, full_name, whatsapp").eq("tenant_id", tenantId);
  if (term) query = query.or(`full_name.ilike.%${term}%,whatsapp.ilike.%${term}%`);
  const { data: customers } = await query.order("full_name").limit(20);
  const generic = `https://wa.me/?text=${encodeURIComponent(bookingMessage(tenant.name, url))}`;

  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Divulgação</h1>
      <p className="mt-1 text-muted">Mande o link de agendamento para os clientes ou deixe o QR code no balcão.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
        <section className="rounded-lg border border-line bg-surface p-4" aria-label="QR code">
          <div className="mx-auto w-56 rounded bg-white p-2" role="img" aria-label="QR code do link de agendamento" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-2 text-center text-sm text-muted">Aponte a câmera do celular</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <a className="btn-ghost" href="/painel/divulgacao/qr?f=png">Baixar PNG</a>
            <a className="btn-ghost" href="/painel/divulgacao/qr?f=svg">Baixar SVG</a>
          </div>
          <Link className="btn mt-3 block text-center" href="/painel/divulgacao/cartaz">Cartaz para imprimir</Link>
        </section>

        <section className="rounded-lg border border-line bg-surface p-4" aria-label="Link de agendamento">
          <h2 className="font-display text-2xl font-bold">Link de agendamento</h2>
          <input className="field mt-2" readOnly value={url} aria-label="Link de agendamento" />
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={url} />
            <a className="btn" href={generic} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a>
            <a className="btn-ghost" href={url} target="_blank" rel="noopener noreferrer">Abrir a página</a>
          </div>
          <p className="mt-3 text-sm text-muted">&ldquo;Enviar pelo WhatsApp&rdquo; abre o WhatsApp com a mensagem pronta, e você escolhe para quem mandar.</p>
          <pre className="mt-3 whitespace-pre-wrap rounded bg-surface2 p-3 text-sm">{bookingMessage(tenant.name, url)}</pre>
        </section>
      </div>

      <h2 className="mt-8 font-display text-2xl font-bold">Enviar para um cliente</h2>
      <form className="mt-2 flex gap-2" role="search">
        <input className="field" name="q" defaultValue={term} placeholder="Buscar por nome ou WhatsApp" aria-label="Buscar clientes" />
        <button className="btn-ghost" type="submit">Buscar</button>
      </form>
      <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
        {(customers ?? []).map((c) => {
          const l = waLink(c.whatsapp, bookingMessage(tenant.name, url, c.full_name));
          return (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span><span className="font-medium">{c.full_name}</span> <span className="text-sm text-muted">{formatPhone(c.whatsapp)}</span></span>
              {l ? <a className="btn-ghost" href={l} target="_blank" rel="noopener noreferrer">Enviar link</a> : <span className="text-sm text-muted">Sem WhatsApp válido</span>}
            </li>
          );
        })}
        {!customers?.length && <li className="p-4 text-muted">Nenhum cliente encontrado.</li>}
      </ul>
      <p className="mt-2 text-sm text-muted">Mostrando até 20 clientes. Use a busca para achar os outros.</p>
    </>
  );
}
