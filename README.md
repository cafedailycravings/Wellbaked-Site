# Rustic Bakes by Daily Cravings

A full-stack artisan bakery e-commerce platform built with **React**, **FastAPI**, and **MongoDB**. Customer-facing storefront with cart, checkout, cake builder, reviews, wishlist, loyalty & referral rewards, plus a complete admin panel to manage products, orders, inventory, images, delivery zones, custom cakes, reviews, site content, Instagram feed, payments, and sales reports.

**Live preview:** https://rustic-craving.preview.emergentagent.com

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [API Reference](#api-reference)
- [Admin Panel](#admin-panel)
- [Customer Features](#customer-features)
- [Third-party Integrations](#third-party-integrations)
- [Deployment](#deployment)
- [Test Credentials](#test-credentials)

---

## Features

### Storefront
- **Home** — hero, featured bakes, 11 category tiles with icons, review wall marquee, cake-builder teaser, Instagram feed
- **Shop** — filter by any of 11 alphabetically-sorted categories with tinted icons
- **Category Landing Pages** — `/category/:slug` — dedicated storyteller page with hero, story, and asymmetric lookbook grid
- **Product Detail** — image, description, quantity picker, lead-time info, wishlist heart, star-rated customer reviews with photos, review form for signed-in customers
- **Cake Builder** at `/customize` — flavour × size × layers × colour × message picker with live stacked-layer preview + drip animation, dynamic ₹ estimate, sends request to admin + WhatsApp
- **Gifting** at `/gifting` — hero, 5 occasion pickers, signature gift boxes, "How it works" 3-step flow, quote-request form
- **Cart & Checkout** — sticky summary, pincode delivery checker with fee, Stripe secure checkout, auto-populated customer details when signed-in
- **Account** — profile with saved delivery address, order history, loyalty punch-card, wishlist, referral share card
- **Same-Day Badge** — glowing gold "READY IN 1 HOUR" pill on Instant Delivery products

### Currency & Localization
- All prices in **INR (₹)** via Stripe currency=`inr`
- 6-digit Indian pincode delivery zone system seeded with 7 metros (Delhi, Gurgaon, Noida, Mumbai, Bangalore + wildcard `110xxx` prefix match)

### Admin Panel (14 tabs)
1. **Overview** — 6 KPI tiles, 7-day revenue bar chart, best-selling items ranked with revenue bars, latest orders & inquiries, monthly PDF sales report generator
2. **Products** — CRUD with category dropdown, price, stock, lead time, featured/active toggles
3. **Inventory** — quick stock updates with low-stock highlighting
4. **Categories** — CRUD with slug, image, description
5. **Images** — Cloudinary signed-upload from device + URL library with copy-to-clipboard
6. **Orders** — status pipeline (pending → confirmed → baking → ready → delivered)
7. **Custom Cakes** — moderate cake-builder requests with 6-status workflow
8. **Reviews** — approve / hide / delete customer reviews with photos
9. **Inquiries** — contact & gifting form submissions with status tracking
10. **Delivery Zones** — CRUD pincode zones with fee & delivery window
11. **Site Content** — edit hero, about, contact info live
12. **Instagram** — paste 6 recent Instagram post images/links to populate homepage feed (no Meta API needed)
13. **Payment Gateway** — Stripe test/live mode settings
14. **Profile** — admin name and password change

### Growth Features
- **Loyalty punch-card** — 10 paid orders unlock 1 free bake
- **Referral rewards** — each customer gets a share link; 3 successful referrals = 1 free bake, prevents farming (only first paid order per referred user counts)
- **Auto sold-out** — products with `stock = 0` are hidden from public listings; owner gets WhatsApp + email alert
- **Featured Review Wall** — infinite-scroll marquee of 4+ star reviews on home
- **Monthly PDF sales report** — branded PDF with summary tiles, best-seller table, full order log; downloadable per month from admin overview

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18, React Router 7, Tailwind CSS 3, lucide-react icons, sonner toasts |
| Backend | FastAPI 0.115, Uvicorn, Motor (async MongoDB driver), Pydantic 2 |
| Database | MongoDB (local dev; Atlas recommended for prod) |
| Auth | PyJWT + bcrypt (JWT bearer tokens, 7-day expiry, roles = `admin` \| `customer`) |
| Payments | Stripe via `emergentintegrations` library, currency INR |
| Email | Resend API (transactional) |
| WhatsApp | Meta WhatsApp Business Cloud API (owner notifications) |
| Image hosting | Cloudinary (signed uploads) |
| PDF generation | fpdf2 |
| Fonts | Playfair Display (headings), Manrope (body), Dancing Script (accent) |

### Design system
- **Palette**: warm cream `#F9F6F0`, rich brown `#4A3022`, blush pink `#E8B4B8`, wheat gold `#D4AF37`
- **Aesthetic**: rustic vintage-artisan with generous whitespace, subtle grain textures, and asymmetric layouts
- Detailed guidelines in `/app/design_guidelines.json`

---

## Project Structure

```
/app
├── backend/
│   ├── server.py              # ~1150 lines - all endpoints, auth, integrations
│   ├── requirements.txt
│   └── .env                   # local secrets (NOT committed)
├── frontend/
│   ├── src/
│   │   ├── App.js             # router
│   │   ├── index.js
│   │   ├── index.css          # Tailwind + brand styles
│   │   ├── lib.js             # axios instance, cart, auth utilities
│   │   ├── Layout.js          # Nav + Footer
│   │   ├── categoryIcons.js   # slug → lucide icon + tint mapping
│   │   ├── SameDayBadge.js    # animated instant-delivery pill
│   │   ├── ReviewWall.js      # infinite scroll marquee
│   │   ├── PincodeChecker.js  # checkout pincode widget
│   │   ├── Wishlist.js        # heart button + state helpers
│   │   └── pages/
│   │       ├── Home.js
│   │       ├── Shop.js
│   │       ├── Product.js
│   │       ├── CategoryPage.js
│   │       ├── CakeBuilder.js
│   │       ├── Gifting.js
│   │       ├── About.js
│   │       ├── Contact.js
│   │       ├── Cart.js
│   │       ├── Checkout.js
│   │       ├── PaymentSuccess.js
│   │       ├── Login.js
│   │       ├── Account.js
│   │       ├── AdminLogin.js
│   │       └── Admin.js       # ~800 lines, 14 tabs
│   ├── package.json
│   └── tailwind.config.js
├── DEPLOYMENT.md              # GoDaddy + Cloudflare + Render deploy guide
├── README.md                  # you are here
└── memory/
    ├── PRD.md
    └── test_credentials.md
```

---

## Environment Variables

### Backend (`/app/backend/.env`)

```env
# Core
MONGO_URL="mongodb://localhost:27017"
DB_NAME="rustic_bakes"
CORS_ORIGINS="*"
JWT_SECRET="<64-char random hex>"
SITE_URL="https://rustic-craving.preview.emergentagent.com"

# Admin seed
ADMIN_EMAIL="admin@rusticbakes.com"
ADMIN_PASSWORD="RusticBakes@2026"

# Email (optional - Resend)
RESEND_API_KEY=""                    # re_...
SENDER_EMAIL="onboarding@resend.dev"
OWNER_EMAIL="orders@cafedailycravings.com"

# Payments (Stripe)
STRIPE_API_KEY="sk_test_emergent"    # shared sandbox key; swap to sk_test_ / sk_live_ for prod

# Cloudinary (optional - image uploads)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# WhatsApp (optional - Meta Cloud API)
META_WHATSAPP_TOKEN=""
META_WHATSAPP_PHONE_NUMBER_ID=""
META_GRAPH_VERSION="v18.0"
OWNER_WHATSAPP_NUMBER="+918284990433"
```

### Frontend (`/app/frontend/.env`)

```env
REACT_APP_BACKEND_URL=https://<your-app>.preview.emergentagent.com
WDS_SOCKET_PORT=443
```

Every optional integration **gracefully skips** when unconfigured — the site keeps working with in-app fallbacks and log warnings.

---

## Running Locally

Backend and frontend are supervisor-managed in this container. To restart:

```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

Hot reload is enabled on both — regular code changes appear instantly. Restart only after `.env` edits or dependency installs.

Logs:
```bash
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log
```

---

## API Reference

All endpoints are prefixed with `/api`. Auth-protected routes require `Authorization: Bearer <JWT>`.

### Public (no auth)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/products` | List active in-stock products (query: `category`, `featured`) |
| GET | `/products/{slug}` | Product detail |
| GET | `/products/{slug}/reviews` | Public approved reviews for a product |
| GET | `/categories` | List all categories (sorted alphabetically) |
| GET | `/categories/{slug}` | Category detail + its products |
| GET | `/content/{key}` | Fetch dynamic content by key (`hero`, `about`, `contact`, `instagram`) |
| GET | `/reviews/featured` | Top-rated (4+ star) reviews for the review wall |
| GET | `/delivery/check/{pincode}` | Check if a pincode is serviceable + fee |
| POST | `/inquiries` | Submit contact/gifting inquiry (also triggers email + WhatsApp) |
| POST | `/custom-cake` | Submit cake-builder request |
| POST | `/payments/checkout` | Start Stripe checkout session |
| GET | `/payments/status/{session_id}` | Poll payment status |
| POST | `/webhook/stripe` | Stripe webhook receiver |
| POST | `/auth/register` | Create customer account (accepts optional `referral_code`) |
| POST | `/auth/login` | Login (admin or customer) |

### Customer (auth: customer or admin)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/auth/me` | Current user |
| PUT | `/auth/profile` | Update name/phone/address/password |
| GET | `/auth/orders` | Current user's order history |
| GET | `/loyalty` | Punches count + available rewards |
| GET | `/wishlist` | Current user's wishlist products |
| POST | `/wishlist/{product_id}` | Toggle product in wishlist |
| POST | `/products/{slug}/reviews` | Post a review (auto-approved) |
| GET | `/referrals` | Referral code + progress + share message |

### Admin only (auth: admin)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/admin/stats` | KPI counts |
| GET | `/admin/dashboard` | Revenue trend, best-sellers, recent orders/inquiries |
| GET | `/admin/reports/sales?year=&month=` | Download PDF monthly report |
| CRUD | `/admin/products` | Product CRUD |
| CRUD | `/admin/categories` | Category CRUD |
| CRUD | `/admin/media` | Media library CRUD |
| CRUD | `/admin/orders` | List + update order status |
| CRUD | `/admin/inquiries` | List + update inquiry status |
| CRUD | `/admin/reviews` | Moderate reviews |
| CRUD | `/admin/custom-cakes` | Manage cake-builder requests |
| CRUD | `/admin/delivery-zones` | Manage delivery pincodes |
| GET/PUT | `/admin/content` | Read/upsert site content |
| GET/PUT | `/admin/payment-settings` | Payment gateway config |
| GET | `/admin/cloudinary/signature` | Generate signed upload params |
| GET | `/admin/cloudinary/status` | Check Cloudinary configuration |

---

## Admin Panel

Navigate to `/admin/login`, sign in with credentials from `/app/memory/test_credentials.md`. The 14-tab dashboard covers everything a bakery owner needs — no code changes needed for daily operations.

## Customer Features

### Loyalty
- Every paid Stripe order = 1 punch (only counts if the customer is signed in)
- 10 punches = 1 free-bake reward, punches reset
- Visual punch-card on `/account`

### Referrals
- Each customer gets an 8-char referral code (e.g. `A7F3B2C9`)
- Share link: `<site>/login?ref=A7F3B2C9` auto-fills the code on register
- Referrer earns 1 punch per new referred customer's **first** paid order (prevents farming)
- 3 referrals = 1 free-bake reward

### Wishlist
- Heart button on every product tile
- Signed-in users have server-persisted wishlist; anonymous users are prompted to sign in
- Dedicated Wishlist tab under `/account`

---

## Third-party Integrations

All are optional and **gracefully skip** when unconfigured. The site remains functional either way.

| Integration | Purpose | Env vars |
|-------------|---------|----------|
| **Stripe** | Payment checkout | `STRIPE_API_KEY` |
| **Resend** | Order confirmations & inquiry emails | `RESEND_API_KEY`, `SENDER_EMAIL` |
| **Meta WhatsApp Cloud API** | Owner alerts on new orders, inquiries, cake requests, sold-out products | `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_NUMBER_ID`, `OWNER_WHATSAPP_NUMBER` |
| **Cloudinary** | Admin image uploads (products, categories, review photos) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |

See `DEPLOYMENT.md` for step-by-step setup of each integration.

---

## Deployment

Full guide in [`DEPLOYMENT.md`](./DEPLOYMENT.md) — covers:
- Domain purchase on GoDaddy
- Cloudflare DNS, SSL, and CDN setup
- Backend hosting on Render (or Railway / DigitalOcean)
- MongoDB Atlas free-tier cluster
- Frontend on Cloudflare Pages or GoDaddy cPanel
- Post-deployment checklist and troubleshooting

---

## Test Credentials

See `/app/memory/test_credentials.md`.

- **Admin**: `admin@rusticbakes.com` / `RusticBakes@2026`
- **Stripe test card**: `4242 4242 4242 4242`, any future date, any CVC

---

## License

Proprietary — © Rustic Bakes by Daily Cravings. All rights reserved.

Made with ♥ for the small bakery with a big heart.
