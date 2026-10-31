# Barbearia 22 · SaaS de gestão (Etapas 1 a 3)

Next.js 16 + TypeScript + Tailwind 4 + Supabase (Postgres, Auth, RLS).

## Já funciona nesta etapa
- Cadastro da barbearia (cria conta, barbearia, unidade principal e vínculo de dono) e login/logout
- Isolamento multiempresa: toda tabela tem `tenant_id` e RLS; permissões por perfil (owner, manager, barber, customer)
- Resumo com números reais do banco (atendimentos e faturamento do dia, clientes, profissionais, serviços)
- CRUD de serviços com validação, permissão por perfil e log de auditoria
- Agenda no banco com bloqueio de sobreposição por profissional (constraint `appointments_no_overlap`)
- Profissionais: cadastro, comissão, serviços que executa e jornada semanal
- Clientes: cadastro, busca com paginação, edição e histórico de agendamentos
- Agenda: visão por dia, horários livres calculados pela jornada e pelos atendimentos ativos (revalidados no servidor), mudança de situação
- Horários sempre em Brasília (UTC-3), mesmo com o servidor da Vercel em UTC
- Conta: troca de senha (/painel/conta) e recuperação por e-mail (/esqueci); links de e-mail passam por /auth/callback
- Equipe (só proprietário): convida por e-mail e define gerente ou barbeiro
- Página pública de agendamento: /b/SEU-ENDERECO (sem login; pedidos entram como "Aguardando confirmação")
- Testes: `npm test` (cálculo de horários livres)
- Dados demonstrativos: tabela de preços da Barbearia 22 (`supabase/seed.sql`; durações são sugestões)

## Instalação
1. `npm install`
2. Crie um projeto no Supabase e copie `.env.example` para `.env.local` com a URL, a chave publishable e a chave secret.
3. Aplique o banco: `supabase link --project-ref SEU_REF && supabase db push` (ou rode `supabase/migrations/*.sql` no SQL Editor).
4. (Opcional) Rode `supabase/seed.sql` para carregar a Barbearia 22 de demonstração.
5. `npm run dev` e abra http://localhost:3000

A chave secret só é usada em `lib/supabase/admin.ts` (servidor), no cadastro da barbearia. Nunca a coloque em variável `NEXT_PUBLIC_`.

## Publicar na Vercel
1. Suba a pasta para um repositório no GitHub e importe em vercel.com (framework Next.js é detectado sozinho).
2. Em Settings > Environment Variables, cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` (esta última só como variável de servidor).
3. No Supabase, em Authentication > URL Configuration, coloque o domínio da Vercel como Site URL e adicione `https://SEU-DOMINIO/**` em Redirect URLs (necessário para confirmação de e-mail, recuperação de senha e convites).

## Próximas etapas
Visão semanal da agenda, avisos por WhatsApp e cadastro do perfil da barbearia (logo, endereço, horários); depois comandas, caixa, financeiro, comissões, estoque e fidelidade; por fim campanhas, pagamento online, PWA e planos do SaaS.
