-- Etapa 1: base multiempresa (tenants), perfis, catálogo, clientes e agenda.
-- Toda tabela de negócio tem tenant_id e RLS ativo.

create extension if not exists btree_gist with schema extensions;
create schema if not exists private;

create type public.app_role as enum ('owner', 'manager', 'barber', 'customer');
create type public.appointment_status as enum (
  'pending', 'awaiting_confirmation', 'confirmed', 'in_service',
  'completed', 'cancelled', 'no_show'
);

-- ---------- Núcleo ----------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active', 'blocked', 'trial')),
  created_at timestamptz not null default now()
);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  branch_id uuid references public.branches (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- ---------- Catálogo ----------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  kind text not null default 'service' check (kind in ('service', 'product')),
  unique (tenant_id, kind, name)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  description text,
  price_cents integer not null check (price_cents >= 0),
  duration_min integer not null default 30 check (duration_min between 5 and 480),
  commission_pct numeric(5,2) not null default 50 check (commission_pct between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  photo_url text,
  commission_pct numeric(5,2) not null default 50 check (commission_pct between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.professional_services (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (professional_id, service_id)
);

create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- ---------- Clientes e agenda ----------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null check (char_length(full_name) >= 2),
  phone text,
  whatsapp text,
  email text,
  birth_date date,
  notes text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  customer_id uuid not null references public.customers (id) on delete restrict,
  professional_id uuid not null references public.professionals (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  price_cents integer not null check (price_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- impede dois atendimentos ativos sobrepostos para o mesmo profissional
  constraint appointments_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status not in ('cancelled', 'no_show'))
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index on public.branches (tenant_id);
create index on public.memberships (user_id);
create index on public.services (tenant_id, is_active);
create index on public.professionals (tenant_id, is_active);
create index on public.professional_services (tenant_id, service_id);
create index on public.working_hours (professional_id, weekday);
create index on public.customers (tenant_id, full_name);
create index on public.appointments (tenant_id, starts_at);
create index on public.appointments (customer_id);
create index on public.audit_logs (tenant_id, created_at desc);

-- ---------- Funções de permissão (schema privado, não exposto na API) ----------
create function private.is_member(t uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = t and m.user_id = (select auth.uid())
  );
$$;

create function private.has_role(t uuid, roles public.app_role[]) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.tenant_id = t and m.user_id = (select auth.uid()) and m.role = any (roles)
  );
$$;

create function private.is_superadmin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins p where p.user_id = (select auth.uid()));
$$;

revoke all on all functions in schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on all functions in schema private to authenticated;

-- ---------- Grants (RLS decide as linhas) ----------
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
revoke all on public.platform_admins from authenticated;
grant select on public.tenants, public.branches, public.categories, public.services,
  public.professionals, public.professional_services to anon;

-- ---------- RLS ----------
alter table public.tenants enable row level security;
alter table public.platform_admins enable row level security;
alter table public.memberships enable row level security;
alter table public.customers enable row level security;
alter table public.appointments enable row level security;
alter table public.audit_logs enable row level security;

create policy tenants_public_read on public.tenants for select to anon
  using (status = 'active');
create policy tenants_member_read on public.tenants for select to authenticated
  using (private.is_member(id) or private.is_superadmin());
create policy tenants_owner_update on public.tenants for update to authenticated
  using (private.has_role(id, array['owner']::public.app_role[]) or private.is_superadmin())
  with check (private.has_role(id, array['owner']::public.app_role[]) or private.is_superadmin());

create policy memberships_read on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.has_role(tenant_id, array['owner','manager']::public.app_role[]));
create policy memberships_owner_insert on public.memberships for insert to authenticated
  with check (private.has_role(tenant_id, array['owner']::public.app_role[]));
create policy memberships_owner_update on public.memberships for update to authenticated
  using (private.has_role(tenant_id, array['owner']::public.app_role[]))
  with check (private.has_role(tenant_id, array['owner']::public.app_role[]));
create policy memberships_owner_delete on public.memberships for delete to authenticated
  using (private.has_role(tenant_id, array['owner']::public.app_role[]));

-- Catálogo e equipe: leitura para membros, escrita para dono/gerente
do $$
declare t text;
begin
  foreach t in array array['branches','categories','services','professionals','professional_services','working_hours']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.is_member(tenant_id))', t || '_member_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_role(tenant_id, array[''owner'',''manager'']::public.app_role[]))', t || '_staff_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_role(tenant_id, array[''owner'',''manager'']::public.app_role[])) with check (private.has_role(tenant_id, array[''owner'',''manager'']::public.app_role[]))', t || '_staff_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_role(tenant_id, array[''owner'',''manager'']::public.app_role[]))', t || '_staff_delete', t);
  end loop;
end $$;

-- Leitura pública para a página de agendamento (somente itens ativos de barbearias ativas)
create policy branches_public_read on public.branches for select to anon
  using (is_active and exists (select 1 from public.tenants t where t.id = tenant_id and t.status = 'active'));
create policy categories_public_read on public.categories for select to anon
  using (exists (select 1 from public.tenants t where t.id = tenant_id and t.status = 'active'));
create policy services_public_read on public.services for select to anon
  using (is_active and exists (select 1 from public.tenants t where t.id = tenant_id and t.status = 'active'));
create policy professionals_public_read on public.professionals for select to anon
  using (is_active and exists (select 1 from public.tenants t where t.id = tenant_id and t.status = 'active'));
create policy professional_services_public_read on public.professional_services for select to anon
  using (exists (select 1 from public.tenants t where t.id = tenant_id and t.status = 'active'));

-- Clientes e agenda: barbeiros também operam; exclusão só dono/gerente
create policy customers_member_read on public.customers for select to authenticated
  using (private.is_member(tenant_id) and not private.has_role(tenant_id, array['customer']::public.app_role[])
         or user_id = (select auth.uid()));
create policy customers_staff_insert on public.customers for insert to authenticated
  with check (private.has_role(tenant_id, array['owner','manager','barber']::public.app_role[]));
create policy customers_staff_update on public.customers for update to authenticated
  using (private.has_role(tenant_id, array['owner','manager','barber']::public.app_role[]))
  with check (private.has_role(tenant_id, array['owner','manager','barber']::public.app_role[]));
create policy customers_manager_delete on public.customers for delete to authenticated
  using (private.has_role(tenant_id, array['owner','manager']::public.app_role[]));

create policy appointments_read on public.appointments for select to authenticated
  using (
    (private.is_member(tenant_id) and not private.has_role(tenant_id, array['customer']::public.app_role[]))
    or exists (select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid()))
  );
create policy appointments_staff_insert on public.appointments for insert to authenticated
  with check (private.has_role(tenant_id, array['owner','manager','barber']::public.app_role[]));
create policy appointments_staff_update on public.appointments for update to authenticated
  using (private.has_role(tenant_id, array['owner','manager','barber']::public.app_role[]))
  with check (private.has_role(tenant_id, array['owner','manager','barber']::public.app_role[]));
create policy appointments_manager_delete on public.appointments for delete to authenticated
  using (private.has_role(tenant_id, array['owner','manager']::public.app_role[]));

create policy audit_manager_read on public.audit_logs for select to authenticated
  using (private.has_role(tenant_id, array['owner','manager']::public.app_role[]));
create policy audit_member_insert on public.audit_logs for insert to authenticated
  with check (private.is_member(tenant_id) and user_id = (select auth.uid()));
