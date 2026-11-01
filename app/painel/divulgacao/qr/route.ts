import QRCode from "qrcode";
import { requireTenant } from "@/lib/session";
import { getOrigin } from "@/lib/origin";
import { bookingUrl } from "@/lib/booking-link";

// QR code do link de agendamento, para baixar em PNG (WhatsApp, Instagram) ou SVG (gráfica).
export async function GET(req: Request) {
  const { tenant } = await requireTenant();
  const url = bookingUrl(await getOrigin(), tenant.slug);
  const f = new URL(req.url).searchParams.get("f") === "svg" ? "svg" : "png";
  const opts = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#000000", light: "#ffffff" } };
  if (f === "svg") {
    const svg = await QRCode.toString(url, { ...opts, type: "svg" });
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `attachment; filename="qr-agendamento-${tenant.slug}.svg"` } });
  }
  const png = await QRCode.toBuffer(url, { ...opts, width: 1024 });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="qr-agendamento-${tenant.slug}.png"` } });
}
