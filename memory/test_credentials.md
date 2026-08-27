# Test Credentials — Rustic Bakes

## Admin (seeded on backend startup)
- URL: `/admin/login`
- Email: `admin@rusticbakes.com`
- Password: `RusticBakes@2026`
- Source: `/app/backend/.env` (ADMIN_EMAIL, ADMIN_PASSWORD)

## Customer
- Create via `/login` → "Create an account" tab
- Or register via `POST /api/auth/register` with { email, password, name, phone, address }

## Stripe (test mode)
- Card: `4242 4242 4242 4242`
- Any future expiry, any CVC, any ZIP
- Currency: INR (₹)
- Server key: `sk_test_emergent` (shared sandbox — provisioned automatically)

## Resend Email
- API key is a placeholder in dev; emails silently skipped
- To enable: replace `RESEND_API_KEY` in `/app/backend/.env` with real key from resend.com
