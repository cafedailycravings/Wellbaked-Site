# Rustic Bakes by Daily Cravings — PRD

## Problem Statement
Build "Rustic Bakes" — a full-stack website for the artisan bakery "Rustic Bakes by Daily Cravings", using visual inspiration from the Wellbaked-Site repo but with fresh modern redesign around the provided logo (warm cream, dark brown, blush pink). Includes storefront, customer accounts, checkout, and admin content management.

## Tech Stack
- Frontend: React 18, React Router 7, Tailwind CSS, lucide-react, sonner
- Backend: FastAPI, MongoDB (Motor async), PyJWT, bcrypt
- Payments: Stripe via `emergentintegrations` (currency=INR)
- Email: Resend (placeholder key — silently skipped in dev)
- Auth: JWT email/password; roles = `admin`, `customer`

## User Personas
- **Customer** — browses shop, filters by category, adds to cart, checks out with saved profile
- **Admin (bakery owner)** — manages products, inventory, categories, orders, inquiries, site content, images, payment settings, and profile

## Core Requirements
- Rebrand as "Rustic Bakes by Daily Cravings" with new logo & theme
- Currency: INR (₹)
- Customer register/login with saved profile that auto-populates checkout
- Admin panel with all content-manageable pages
- Stripe test-mode checkout end-to-end
- Contact/inquiry form
- Deployment guide for GoDaddy + Cloudflare (delivered separately)

## Implemented (2026-01-27)
- Full storefront: Home (hero, categories, featured, about teaser), Shop (with category filter), Product detail (with qty picker), About, Contact, Cart, Checkout, Payment success
- Customer auth: /login (register + sign in), /account (edit profile, view orders)
- Admin auth: /admin/login → /admin dashboard
- Admin tabs: Overview, Products (CRUD), Inventory (stock updates), Categories (CRUD), Images (Cloudinary file upload + URL library), Orders (view + status), Inquiries (view + status), Site Content (hero/about/contact), Payment Gateway (settings), Profile (name/password)
- Stripe checkout with INR currency, order tracking via session polling, auto-save customer details on checkout when logged in
- 6 seeded products with INR prices, 4 categories, default site content
- Backend testing: 40/40 pytest cases pass

## Implemented (2026-01-27, later)
- **Cloudinary integration**: signed upload flow for admin file uploads (env: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET). Graceful "not configured" banner in Images tab. Auto-delete from Cloudinary when media record is removed.
- **Meta WhatsApp Business Cloud API**: `send_whatsapp_text` helper called on new inquiry and new paid order. Owner number `+918284990433` seeded. Env vars: META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID, META_GRAPH_VERSION, OWNER_WHATSAPP_NUMBER. Silently skips (logs) when not configured — doesn't fail order/inquiry.
- **DEPLOYMENT.md**: full GoDaddy + Cloudflare + Render + MongoDB Atlas + Cloudinary + Resend + Meta WhatsApp deployment guide at `/app/DEPLOYMENT.md`.

## Prioritized Backlog
### P1 (near-term)
- Real Resend API key from user for live email delivery
- Real Stripe account (BYOK) once user's country is supported or via alternative provider
- Product image upload (base64/S3) instead of URL only
- Order confirmation page shows itemized receipt

### P2
- Guest order tracking via order-id lookup
- Discount codes / promo engine
- Wishlist / favourites
- Multi-address book on customer profile
- Newsletter opt-in with Resend audience

### P3
- WhatsApp order-status notifications
- Loyalty points / rewards
- Recipe blog CMS
- Multi-language (Hindi/English toggle)

## Deployment (GoDaddy + Cloudflare guide)
1. Frontend: `cd frontend && yarn build` → upload `build/` to GoDaddy web hosting `public_html`
2. Backend: needs a real Node/Python host (GoDaddy shared hosting won't run FastAPI). Use Render / Railway / DigitalOcean droplet
3. Cloudflare: point domain DNS to GoDaddy (A record) and backend host (CNAME `api.yourdomain.com`)
4. Set `REACT_APP_BACKEND_URL=https://api.yourdomain.com` before build

## Test Credentials
See `/app/memory/test_credentials.md`
