import Link from "next/link";
import QRCode from "qrcode";
import { requireTenant } from "@/lib/session";
import { getOrigin } from "@/lib/origin";
import { bookingUrl } from "@/lib/booking-link";
import { Logo } from "@/app/logo";
import { PrintButton } from "../botoes";

export default async function Cartaz() {
  const { tenant } = await requireTenant();
  const url = bookingUrl(await getOrigin(), tenant.slug);
  const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
  return (
    <>
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link href="/painel/divulgacao" className="text-sm text-accent underline">Voltar para divulgação</Link>
        <PrintButton />
        <span className="text-sm text-muted">Na janela de impressão, escolha papel A4 e ative &ldquo;Gráficos de fundo&rdquo;.</span>
      </div>
      <div className="poster mx-auto mt-4 flex max-w-xl flex-col items-center rounded-2xl bg-black p-8 text-center text-white">
        <Logo width={320} priority />
        <h1 className="mt-6 font-display text-5xl font-extrabold uppercase leading-none text-[#F5C400]">Agende seu horário</h1>
        <p className="mt-2 text-lg">Aponte a câmera do celular para o QR code</p>
        <div className="mt-5 w-72 rounded-xl bg-white p-3" role="img" aria-label="QR code do link de agendamento" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-4 break-all text-sm text-white/80">{url}</p>
        <p className="mt-3 font-display text-2xl italic text-[#F5C400]">Mais que um corte, é autoestima!</p>
      </div>
    </>
  );
}
