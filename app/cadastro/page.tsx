import { Logo } from "@/app/logo";
import Link from "next/link";
import { signup } from "./actions";

const erros: Record<string, string> = {
  dados: "Preencha o nome da barbearia, um e-mail válido e uma senha com 8 ou mais caracteres.",
  conta: "Não foi possível criar a conta. Esse e-mail pode já estar em uso.",
  barbearia: "A conta foi criada, mas a barbearia não. Tente entrar ou contate o suporte.",
};

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Logo width={140} priority />
      <h1 className="mt-6 font-display text-4xl font-extrabold">Cadastrar barbearia</h1>
      {erro && <p role="alert" className="mt-4 text-danger">{erros[erro] ?? "Não foi possível cadastrar."}</p>}
      <form action={signup} className="mt-6 space-y-4">
        <label className="block text-sm">Nome da barbearia
          <input className="field mt-1" name="shop" required minLength={2} maxLength={120} />
        </label>
        <label className="block text-sm">E-mail do responsável
          <input className="field mt-1" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm">Senha
          <input className="field mt-1" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </label>
        <button className="btn w-full" type="submit">Criar conta</button>
      </form>
      <p className="mt-6 text-sm text-muted">Já tem conta? <Link className="text-accent underline" href="/entrar">Entrar</Link></p>
    </main>
  );
}
