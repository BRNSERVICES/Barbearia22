-- Dados demonstrativos: Barbearia 22 e tabela de preços (durações e comissões são sugestões, ajuste no painel).
insert into public.tenants (id, name, slug)
values ('22222222-2222-2222-2222-222222222222', 'Barbearia 22', 'barbearia-22')
on conflict do nothing;

insert into public.branches (tenant_id, name)
select '22222222-2222-2222-2222-222222222222', 'Unidade principal'
where not exists (select 1 from public.branches where tenant_id = '22222222-2222-2222-2222-222222222222');

insert into public.categories (tenant_id, name, kind) values
  ('22222222-2222-2222-2222-222222222222', 'Cabelo', 'service'),
  ('22222222-2222-2222-2222-222222222222', 'Barba', 'service'),
  ('22222222-2222-2222-2222-222222222222', 'Combos', 'service'),
  ('22222222-2222-2222-2222-222222222222', 'Tratamentos e estética', 'service')
on conflict do nothing;

insert into public.services (tenant_id, category_id, name, price_cents, duration_min)
select '22222222-2222-2222-2222-222222222222', c.id, s.name, s.price, s.dur
from (values
  ('Corte', 3500, 30, 'Cabelo'),
  ('Corte raspado', 2000, 20, 'Cabelo'),
  ('Corte na lâmina', 4000, 40, 'Cabelo'),
  ('Pezinho', 1000, 10, 'Cabelo'),
  ('Penteado', 7000, 40, 'Cabelo'),
  ('Barba', 2000, 20, 'Barba'),
  ('Barba desenhada', 2500, 30, 'Barba'),
  ('Barba terapia', 4000, 40, 'Barba'),
  ('Corte e barba', 5000, 50, 'Combos'),
  ('Corte + luzes', 8000, 90, 'Combos'),
  ('Sobrancelha', 1000, 10, 'Tratamentos e estética'),
  ('Progressiva', 9000, 90, 'Tratamentos e estética'),
  ('Meio', 15000, 120, 'Tratamentos e estética'),
  ('Hidratação', 2000, 30, 'Tratamentos e estética'),
  ('Limpeza de pele', 3000, 30, 'Tratamentos e estética'),
  ('Depilação de nariz', 2000, 10, 'Tratamentos e estética'),
  ('Depilação de orelha', 2000, 10, 'Tratamentos e estética'),
  ('Alizamento', 6000, 60, 'Tratamentos e estética')
) as s(name, price, dur, cat)
join public.categories c on c.tenant_id = '22222222-2222-2222-2222-222222222222' and c.name = s.cat and c.kind = 'service'
on conflict do nothing;
