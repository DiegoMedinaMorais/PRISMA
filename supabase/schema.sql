-- ============================================================================
-- PRISMA · Schema completo (Supabase / PostgreSQL)
-- Rode este script inteiro no SQL Editor do Supabase.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABELA PROFILES (perfis de usuários, espelha auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  cargo       text,
  role        text not null default 'operador'
              check (role in ('superadmin', 'operador', 'visualizador')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Perfis dos usuários do PRISMA. role: superadmin | operador | visualizador';

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- 2. HELPER: é superadmin? (security definer para evitar recursão no RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. POLÍTICAS RLS · PROFILES
-- ---------------------------------------------------------------------------
drop policy if exists "perfis: leitura (próprio ou superadmin)" on public.profiles;
create policy "perfis: leitura (próprio ou superadmin)" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.is_superadmin());

drop policy if exists "perfis: inserir próprio perfil" on public.profiles;
create policy "perfis: inserir próprio perfil" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- Usuário atualiza o próprio perfil, mas NÃO pode elevar o próprio role.
drop policy if exists "perfis: atualizar próprio (sem elevar role)" on public.profiles;
create policy "perfis: atualizar próprio (sem elevar role)" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_superadmin())
  with check (
    public.is_superadmin()
    or (
      auth.uid() = id
      and role = (select p.role from public.profiles p where p.id = auth.uid())
    )
  );

drop policy if exists "perfis: excluir somente superadmin" on public.profiles;
create policy "perfis: excluir somente superadmin" on public.profiles
  for delete to authenticated
  using (public.is_superadmin());

-- ---------------------------------------------------------------------------
-- 4. TRIGGER: cria o profile automaticamente a cada novo cadastro
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, cargo, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'cargo', 'Operador'),
    'operador'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atualiza updated_at automaticamente
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. TABELA READINGS (histórico de leituras/simulações do processo)
-- ---------------------------------------------------------------------------
create table if not exists public.readings (
  id                    bigint generated always as identity primary key,
  created_at            timestamptz not null default now(),
  user_id               uuid references auth.users (id) on delete set null,
  scenario              text not null check (scenario in ('clean', 'contaminated')),
  lif1_ppm              numeric(10, 3) not null,
  lif2_ppm              numeric(10, 3) not null,
  mass_recovered_kg     numeric(10, 3) not null default 0,
  energy_saved_pct      numeric(5, 1) not null default 0,
  nanofiltration_active boolean not null default false
);

create index if not exists readings_created_at_idx on public.readings (created_at desc);

alter table public.readings enable row level security;

drop policy if exists "leituras: equipe autenticada lê tudo" on public.readings;
create policy "leituras: equipe autenticada lê tudo" on public.readings
  for select to authenticated using (true);

drop policy if exists "leituras: autenticados inserem" on public.readings;
create policy "leituras: autenticados inserem" on public.readings
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "leituras: superadmin exclui" on public.readings;
create policy "leituras: superadmin exclui" on public.readings
  for delete to authenticated
  using (public.is_superadmin());

-- ---------------------------------------------------------------------------
-- 6. STORAGE · Bucket "avatars" (público para leitura, escrita por dono)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Leitura pública das fotos
drop policy if exists "avatars: leitura pública" on storage.objects;
create policy "avatars: leitura pública" on storage.objects
  for select using (bucket_id = 'avatars');

-- Upload apenas na própria pasta: avatars/<uid>/foto.jpg
drop policy if exists "avatars: upload próprio" on storage.objects;
create policy "avatars: upload próprio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: atualizar próprio" on storage.objects;
create policy "avatars: atualizar próprio" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: excluir próprio" on storage.objects;
create policy "avatars: excluir próprio" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 7. OBRIGATÓRIO (após criar o 1º usuário pelo app):
--    Promova seu usuário a SuperAdmin (troque o e-mail):
--
--    update public.profiles set role = 'superadmin'
--    where id = (select id from auth.users where email = 'voce@email.com');
-- ============================================================================
