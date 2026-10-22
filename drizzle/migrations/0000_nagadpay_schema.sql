create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null default 'admin',
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users can view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nagad_number text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.merchants to authenticated;
grant all on public.merchants to service_role;
grant select on public.merchants to anon;
alter table public.merchants enable row level security;
create policy "Active merchants readable by anyone"
  on public.merchants for select
  using (is_active or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage merchants"
  on public.merchants for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id),
  amount numeric(12,2) not null check (amount > 0),
  order_id text,
  customer_name text,
  customer_phone text,
  redirect_url text,
  callback_url text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  trx_id text,
  verified_at timestamptz,
  callback_sent_at timestamptz,
  callback_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_trx_lookup on public.payments (trx_id);
create index payments_status_idx on public.payments (status, created_at);
grant select on public.payments to anon;
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "Payments readable via payment link" on public.payments for select using (true);
create policy "Admins manage payments"
  on public.payments for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.sms_transactions (
  id uuid primary key default gen_random_uuid(),
  sender text not null,
  body text not null,
  trx_id text,
  amount numeric(12,2),
  account_number text,
  device_id text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index sms_trx_idx on public.sms_transactions (trx_id);
create index sms_received_idx on public.sms_transactions (received_at);
grant select on public.sms_transactions to authenticated;
grant all on public.sms_transactions to service_role;
alter table public.sms_transactions enable row level security;
create policy "Admins view collected transactions"
  on public.sms_transactions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_hash text not null unique,
  key_prefix text not null,
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
alter table public.api_keys enable row level security;
create policy "Admins manage API keys"
  on public.api_keys for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
