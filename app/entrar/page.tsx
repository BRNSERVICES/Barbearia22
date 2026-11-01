import { Logo } from "@/app/logo";
import Link from "next/link";
import { login } from "./actions";

const erros: Record<string, string> = {
  dados: "Confira o e-mail e a senha (mínimo de 6 caracteres).",
  credenciais: "E-mail ou senha incorretos.",
  "sem-barbearia": "Sua conta ainda não está vinculada a uma barbearia.",
  link: "Link inválido ou vencido. Peça um novo.",
  reset: "Enviamos o link para o seu e-mail, se ele estiver cadastrado.",
  confirme: "Conta criada. Confirme seu e-mail para entrar.",
};

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Logo width={140} priority />
      <h1 className="mt-6 font-display text-4xl font-extrabold">Entrar</h1>
      {erro && <p role="alert" className="mt-4 text-danger">{erros[erro] ?? "Não foi possível entrar."}</p>}
      <form action={login} className="mt-6 space-y-4">
        <label className="block text-sm">E-mail
          <input className="field mt-1" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm">Senha
          <input className="field mt-1" name="password" type="password" autoComplete="current-password" required minLength={6} />
        </label>
        <button className="btn w-full" type="submit">Entrar</button>
      </form>
      <p className="mt-4 text-sm"><Link className="text-accent underline" href="/esqueci">Esqueci minha senha</Link></p>
      <p className="mt-2 text-sm text-muted">
        Ainda não tem conta? <Link className="text-accent underline" href="/cadastro">Cadastre sua barbearia</Link>
      </p>
    </main>
  );
}
