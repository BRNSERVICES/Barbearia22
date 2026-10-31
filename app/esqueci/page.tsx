import Link from "next/link";
import { requestReset } from "./actions";

export default async function Esqueci({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const { erro, ok } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-4xl font-extrabold">Recuperar senha</h1>
      {erro && <p role="alert" className="mt-4 text-danger">Informe um e-mail válido.</p>}
      {ok && <p role="status" className="mt-4 text-ok">Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha. Abra no mesmo navegador.</p>}
      <form action={requestReset} className="mt-6 space-y-4">
        <label className="block text-sm">E-mail
          <input className="field mt-1" name="email" type="email" autoComplete="email" required />
        </label>
        <button className="btn w-full" type="submit">Enviar link</button>
      </form>
      <p className="mt-6 text-sm"><Link className="text-accent underline" href="/entrar">Voltar para entrar</Link></p>
    </main>
  );
}
