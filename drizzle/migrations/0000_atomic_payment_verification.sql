ALTER TABLE public.sms_transactions ADD COLUMN IF NOT EXISTS is_credit boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.claim_payment_sms(p_payment uuid, p_sms uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pay public.payments%ROWTYPE; sms public.sms_transactions%ROWTYPE; acct public.merchant_accounts%ROWTYPE;
BEGIN
SELECT * INTO pay FROM public.payments WHERE id=p_payment FOR UPDATE;
IF NOT FOUND OR pay.status <> 'pending' THEN RETURN false; END IF;
SELECT * INTO sms FROM public.sms_transactions WHERE id=p_sms FOR UPDATE;
IF NOT FOUND OR sms.matched_payment_id IS NOT NULL OR NOT sms.is_credit OR sms.trx_id IS NULL OR sms.amount <> pay.amount OR sms.account_number IS NULL THEN RETURN false; END IF;
SELECT * INTO acct FROM public.merchant_accounts WHERE merchant_id=pay.merchant_id AND is_active=true AND provider=sms.provider AND regexp_replace(account_number,'[^0-9]','','g')=regexp_replace(sms.account_number,'[^0-9]','','g') AND account_type=sms.account_type LIMIT 1;
IF NOT FOUND THEN RETURN false; END IF;
IF pay.provider IS NOT NULL AND (pay.provider<>sms.provider OR pay.account_number<>acct.account_number OR pay.account_type<>acct.account_type) THEN RETURN false; END IF;
UPDATE public.sms_transactions SET matched_payment_id=pay.id WHERE id=sms.id;
UPDATE public.payments SET status='complete',trx_id=sms.trx_id,provider=acct.provider,account_number=acct.account_number,account_type=acct.account_type,verified_at=now(),updated_at=now() WHERE id=pay.id;
RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.claim_payment_sms(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_sms(uuid,uuid) TO service_role;