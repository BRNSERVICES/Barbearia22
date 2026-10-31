import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="font-display text-xl text-accent">Barbearia 22</p>
      <h1 className="mt-2 font-display text-6xl font-extrabold leading-[0.95] sm:text-7xl">
        Mais que um corte, é autoestima.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Agenda sem conflito de horário, serviços e preços no mesmo lugar e cada barbearia com seus dados separados.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/cadastro" className="btn">Cadastrar minha barbearia</Link>
        <Link href="/entrar" className="btn-ghost">Entrar</Link>
      </div>
    </main>
  );
}
