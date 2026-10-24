CREATE TABLE public.merchant_accounts (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  provider text not null check (provider in ('bkash','nagad','upay','rocket')),
  account_number text not null,
  account_type text not null default 'merchant' check (account_type in ('personal','merchant')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (merchant_id, provider, account_number, account_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_accounts TO authenticated;
GRANT ALL ON public.merchant_accounts TO service_role;

ALTER TABLE public.merchant_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage merchant accounts ALL"
  ON public.merchant_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX merchant_accounts_merchant_idx ON public.merchant_accounts (merchant_id);

ALTER TABLE public.payments
  ADD COLUMN provider text,
  ADD COLUMN account_number text,
  ADD COLUMN account_type text;

CREATE INDEX payments_provider_status_idx ON public.payments (provider, status);

ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.merchants.provider IS 'DEPRECATED: replaced by public.merchant_accounts rows';
COMMENT ON COLUMN public.merchants.account_number IS 'DEPRECATED: replaced by public.merchant_accounts rows';
COMMENT ON COLUMN public.merchants.nagad_number IS 'DEPRECATED: legacy column, unused';
COMMENT ON COLUMN public.payments.provider IS 'Collection provider + account snapshot chosen when the payment was created';