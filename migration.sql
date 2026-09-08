-- Sorasaki — atualização segura para quem já executou o schema.sql
-- Execute uma vez no SQL Editor do Supabase.

create unique index if not exists uq_orders_payment_id
  on public.orders(payment_id)
  where payment_id is not null;

create unique index if not exists uq_reports_group_reporter
  on public.reports(group_id, reporter_id);

insert into public.promotion_plans (name, description, price, duration_days, active)
values
  ('IMPULSIONAR', 'Maior visibilidade durante o período contratado.', 0, 7, false),
  ('PLUS', 'Mais destaque e benefícios adicionais durante o período contratado.', 0, 15, false),
  ('VIP', 'Maior nível de exposição durante o período contratado.', 0, 30, false)
on conflict (name) do nothing;


-- ===== Sistema de perfil / conta =====
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9_]{3,24}$');

create unique index if not exists uq_profiles_username
  on public.profiles(lower(username))
  where username is not null;

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
