# Roadmap

## Neext Pay refresh and real-flow QA
- [ ] Rename gateway and apply shared modern theme to all pages.
- [ ] Create logo intro video and show it on homepage/loading and checkout for five seconds.
- [ ] Test signed-in admin sections and payment create → SMS ingest → verify → callback → redirect; fix errors.

## Multi-provider SMS gateway (bKash, Nagad, Upay, Rocket)
- [x] Migration: provider + account_number on merchants, provider/account_type/matched_payment_id on sms_transactions, gateway_devices table, callback signing secret
- [x] Best-format SMS reader lib (personal + merchant formats, all 4 providers) + tests
- [ ] Public gateway API: /api/public/gateway/ingest (API-key auth, batch SMS, auto-match to payments)
- [ ] Public payment APIs: create payment (API-key), verify TRX, payment window data
- [ ] Payment window page /pay/$id (copy merchant number, TRX verify, redirect)
- [ ] Admin pages: dashboard, transactions, merchants (multi-provider), payment links, API keys, gateway
- [ ] Callback REST calls signed with merchant callback secret
- [ ] Verify end-to-end: create payment → ingest SMS → verify → callback
