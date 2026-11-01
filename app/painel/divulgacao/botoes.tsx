"use client";
import { useState } from "react";

export function CopyButton({ text, label = "Copiar link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-ghost" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); }
      catch { window.prompt("Copie o link:", text); }
    }}>{done ? "Copiado!" : label}</button>
  );
}

export function PrintButton() {
  return <button type="button" className="btn" onClick={() => window.print()}>Imprimir cartaz</button>;
}
