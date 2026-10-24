-- Multi-provider gateway: bKash, Nagad, Upay, Rocket
ALTER TABLE public.merchants ADD COLUMN provider text NOT NULL DEFAULT 'nagad';
ALTER TABLE public.merchants ADD COLUMN account_number text;
UPDATE public.merchants SET account_number = nagad_number;
ALTER TABLE public.merchants ADD COLUMN callback_secret text;
UPDATE public.merchants SET callback_secret = encode(gen_random_bytes(24), 'hex');
ALTER TABLE public.merchants ADD CONSTRAINT merchants_provider_check CHECK (provider IN ('nagad','bkash','upay','rocket'));
COMMENT ON COLUMN public.merchants.nagad_number IS 'DEPRECATED: replaced by provider + account_number';

ALTER TABLE public.sms_transactions ADD COLUMN provider text;
ALTER TABLE public.sms_transactions ADD COLUMN account_type text;
ALTER TABLE public.sms_transactions ADD COLUMN matched_payment_id uuid REFERENCES public.payments(id);
CREATE INDEX sms_transactions_trx_idx ON public.sms_transactions (trx_id);
CREATE INDEX payments_status_amount_idx ON public.payments (status, amount);

CREATE TABLE public.gateway_devices (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  device_id text not null unique,
  label text,
  platform text not null default 'android',
  phone_number text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  last_ip text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gateway_devices TO authenticated;
GRANT ALL ON public.gateway_devices TO service_role;
ALTER TABLE public.gateway_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gateway devices"
  ON public.gateway_devices
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
