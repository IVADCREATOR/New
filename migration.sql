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
