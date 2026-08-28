# Rustic Bakes — Deployment Guide (GoDaddy + Cloudflare)

This guide walks through publishing **Rustic Bakes by Daily Cravings** to your own domain (e.g. `rusticbakes.com`) using **GoDaddy** for the domain, **Cloudflare** for DNS/SSL, and a cloud host for the FastAPI backend.

> **Important**: GoDaddy shared hosting cannot run FastAPI (Python long-running server). We use GoDaddy only for the domain, host the frontend on Cloudflare Pages (or your GoDaddy cPanel), and host the backend on Render/Railway/DigitalOcean.

---

## Architecture

```
       ┌──────────────┐
       │  User browser│
       └──────┬───────┘
              │  https://rusticbakes.com
              ▼
       ┌──────────────┐         ┌───────────────────────┐
       │  Cloudflare  │◀───DNS──│  GoDaddy (registrar)  │
       │  (proxy+SSL) │         └───────────────────────┘
       └──────┬───────┘
   ┌──────────┴──────────┐
   │                     │
   ▼                     ▼
Frontend            api.rusticbakes.com
(Static React)     (FastAPI on Render/Railway)
                          │
                          ▼
                   MongoDB Atlas (free tier)
```

---

## Step 1 — Buy the domain on GoDaddy

1. Go to **https://godaddy.com** and search for your domain (e.g. `rusticbakes.com`).
2. Complete purchase. Skip GoDaddy's hosting upsell — you only need the domain.

## Step 2 — Set up Cloudflare (free)

1. Sign up at **https://cloudflare.com** → **Add a site** → enter your domain.
2. Choose the **Free plan**.
3. Cloudflare shows you **2 nameservers** like `ada.ns.cloudflare.com` and `bob.ns.cloudflare.com`. **Copy them.**
4. In GoDaddy: **My Products → Domains → DNS → Nameservers → Change → Enter my own nameservers → Paste the two Cloudflare NS values.**
5. Wait 15–60 min for propagation. Cloudflare will email you when active.

## Step 3 — Host the backend (FastAPI)

### Option A — Render.com (easiest, free tier)

1. Create a repo on GitHub with the `/app/backend` folder.
2. Sign up at **https://render.com** → **New → Web Service** → connect the repo.
3. Settings:
   - **Environment**: Python 3.11
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance type**: Free
4. **Environment variables** (add each in Render → Environment):
   ```
   MONGO_URL           = <your MongoDB Atlas connection string>
   DB_NAME             = rustic_bakes
   JWT_SECRET          = <generate a 64-char random string>
   ADMIN_EMAIL         = admin@rusticbakes.com
   ADMIN_PASSWORD      = <strong password>
   RESEND_API_KEY      = <your Resend key>
   OWNER_EMAIL         = orders@cafedailycravings.com
   SENDER_EMAIL        = orders@rusticbakes.com   # verified in Resend
   STRIPE_API_KEY      = <sk_live_... or sk_test_...>
   CLOUDINARY_CLOUD_NAME = <from Cloudinary dashboard>
   CLOUDINARY_API_KEY    = <...>
   CLOUDINARY_API_SECRET = <...>
   META_WHATSAPP_TOKEN   = <permanent Meta token>
   META_WHATSAPP_PHONE_NUMBER_ID = <from Meta WhatsApp API Setup>
   OWNER_WHATSAPP_NUMBER = +918284990433
   CORS_ORIGINS        = https://rusticbakes.com
   ```
5. Deploy → note the URL Render gives you (e.g. `https://rustic-bakes-api.onrender.com`).

### Option B — Railway.app or DigitalOcean droplet

Similar steps — install requirements, run `uvicorn server:app --host 0.0.0.0 --port $PORT`, set env vars.

## Step 4 — MongoDB (free tier)

1. Sign up at **https://cloud.mongodb.com** (Atlas).
2. Create a free **M0 cluster** in the region closest to your backend host.
3. **Database Access** → add user with password → **Network Access** → allow `0.0.0.0/0` (or Render's outbound IP).
4. **Connect → Drivers → Python** → copy the connection string:
   ```
   mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Paste into `MONGO_URL` on Render.

## Step 5 — Point `api.rusticbakes.com` at the backend

In **Cloudflare → DNS**:

| Type  | Name | Content                              | Proxy    |
|-------|------|--------------------------------------|----------|
| CNAME | api  | rustic-bakes-api.onrender.com        | Proxied ☁️ |

SSL will automatically be issued.

## Step 6 — Build & deploy the frontend

### Option A — Cloudflare Pages (recommended, free, fast CDN)

1. In your repo, set this environment variable in the Cloudflare Pages project:
   ```
   REACT_APP_BACKEND_URL=https://api.rusticbakes.com
   ```
2. **Cloudflare → Pages → Create project → Connect to Git**.
3. Settings:
   - **Framework**: Create React App
   - **Build command**: `npm ci && npm run build`
   - **Build output directory**: `build`
   - **Root directory**: `frontend`
4. Add environment variable: `REACT_APP_BACKEND_URL=https://api.rusticbakes.com`
5. Deploy.
6. **Pages → Custom domains → Add** → `cafedailycravings.in` and `www.cafedailycravings.in`. Cloudflare handles DNS automatically.

The repository includes `frontend/public/_redirects`, which CRA copies into `build/` and Cloudflare Pages uses to send every client-side route to React's `index.html`. Keep the API on a separate HTTPS backend origin such as `https://api.cafedailycravings.in`; set `REACT_APP_BACKEND_URL` before each Pages build. Do not commit `.env` files or API keys.

### Option B — GoDaddy shared hosting (cPanel)

1. Locally: set `REACT_APP_BACKEND_URL=https://api.cafedailycravings.in`, then run `cd frontend && npm ci && npm run build`.
2. Zip the `build/` folder contents (not the folder itself).
3. **GoDaddy cPanel → File Manager → public_html** → upload the zip → extract.
4. Add `.htaccess` in `public_html` for React Router (SPA rewrite):
   ```apache
   Options -MultiViews
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteRule ^ index.html [QSA,L]
   ```
5. In Cloudflare DNS: point `rusticbakes.com` (A record) to the GoDaddy hosting IP shown in cPanel.

## Step 7 — Post-deployment checklist

- [ ] Visit `https://rusticbakes.com` — the homepage loads
- [ ] Sign in at `/admin/login` with `admin@rusticbakes.com` / your password
- [ ] Add a real product, upload a Cloudinary image
- [ ] Submit a contact form — verify email arrives at `orders@cafedailycravings.com` AND WhatsApp arrives at `+918284990433`
- [ ] Do a test Stripe checkout with card `4242 4242 4242 4242` — verify confirmation email + WhatsApp
- [ ] Set up **Cloudflare → SSL/TLS → Full (Strict)** for maximum security
- [ ] Enable **Cloudflare → Speed → Auto Minify** (HTML/CSS/JS)
- [ ] Set up **Cloudflare → Rules → Page Rules** to cache static assets (`*.jpg`, `*.js`, `*.css`) for 1 month

## Step 8 — Going live with real Stripe

1. In Stripe Dashboard: **Activate account** (submit business docs).
2. Switch to **live mode**, generate a `sk_live_...` key.
3. Update `STRIPE_API_KEY` on Render → redeploy.
4. Set up **Stripe → Developers → Webhooks** with endpoint `https://api.rusticbakes.com/api/webhook/stripe`. Copy the signing secret if needed.

## Step 9 — Going live with real WhatsApp

1. **Meta for Developers → Your app → WhatsApp → Configuration**.
2. Verify the bakery's phone number (or use an approved template phone).
3. **Business Settings → System Users → Add** → generate a permanent token with `whatsapp_business_messaging` permission.
4. Update `META_WHATSAPP_TOKEN` and `META_WHATSAPP_PHONE_NUMBER_ID` on Render.
5. Create approved templates in **WhatsApp Manager → Message templates**:
   - `bakery_new_order` (utility category)
   - `bakery_new_inquiry` (utility category)

## Troubleshooting

**Site loads but API calls fail** → check `REACT_APP_BACKEND_URL` in the frontend build matches `api.rusticbakes.com`, and `CORS_ORIGINS` in the backend allows `https://rusticbakes.com`.

**Cloudflare "Error 522"** → backend host is down or blocking Cloudflare IPs. Check Render logs.

**Emails not sending** → Resend requires domain verification for custom `from:` addresses. Verify your domain at Resend Dashboard → Domains, then update `SENDER_EMAIL`.

**WhatsApp not sending** → outside 24-hour session window, Meta requires an approved template. Use `/api/whatsapp/send-template` (or add a template variant in `server.py`).

---

## Support contacts
- Cloudflare help: https://developers.cloudflare.com/pages/
- Render help: https://render.com/docs
- Resend help: https://resend.com/docs
- Meta WhatsApp docs: https://developers.facebook.com/docs/whatsapp/cloud-api

Made with ♥ for Rustic Bakes by Daily Cravings.
