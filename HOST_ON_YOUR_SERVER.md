# Host Rustic Bakes on Your Own Server

One-command Docker deploy for **`cafedailycravings.in`** (or any domain). Works on any Ubuntu 22/24 VPS with 1 GB+ RAM (DigitalOcean, Hetzner, AWS Lightsail, GoDaddy VPS, etc.).

---

## Prerequisites

- A Linux VPS with a public IPv4 (any provider — GoDaddy VPS, DigitalOcean droplet, Hetzner, etc.)
- Domain `cafedailycravings.in` registered at GoDaddy
- SSH access to the server as root or a sudo user

---

## Step 1 — Point the domain at your server

In GoDaddy DNS Management for `cafedailycravings.in`:

1. **Delete** any existing `A`, `AAAA`, or `CNAME` records at `@` and `www`.
2. Add these two records:

   | Type  | Name | Value                     | TTL   |
   |-------|------|---------------------------|-------|
   | A     | @    | *your VPS public IPv4*    | 600   |
   | CNAME | www  | @                          | 600   |

3. If you want to route through **Cloudflare** for CDN/DDoS:
   - Add the site to Cloudflare → get its 2 nameservers
   - In GoDaddy: **My Products → Domains → Nameservers → I'll use my own → paste Cloudflare's 2 NS**
   - In Cloudflare DNS, add the same A record above with **Proxied ☁️** ON

Wait 5-15 min for propagation. Verify with:
```bash
dig cafedailycravings.in +short
```

## Step 2 — Prepare the server (one-time)

SSH into your VPS and install Docker:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
```

Open firewall ports (if using ufw):
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Step 3 — Get the code onto the server

**Option A** — via GitHub (recommended):
1. In Emergent chat, click **Save to GitHub** and push to `cafedailycravings/rustic-bakes` (or your own repo).
2. On the server:
   ```bash
   git clone https://github.com/cafedailycravings/rustic-bakes.git
   cd rustic-bakes
   ```

**Option B** — via SCP from your laptop:
1. Zip the workspace locally / download from Emergent, upload:
   ```bash
   scp rustic-bakes.zip user@your-server:/home/user/
   ssh user@your-server
   unzip rustic-bakes.zip -d rustic-bakes && cd rustic-bakes
   ```

## Step 4 — Configure environment

```bash
cp .env.example .env
nano .env
```
Set `REACT_APP_BACKEND_URL=https://cafedailycravings.in`.

Then edit backend secrets:
```bash
nano backend/.env
```
Fill in real values (leave any blank you don't have yet — the app skips them gracefully):

```env
MONGO_URL=mongodb://mongo:27017
DB_NAME=rustic_bakes
JWT_SECRET=<run: openssl rand -hex 32>
SITE_URL=https://cafedailycravings.in
CORS_ORIGINS=https://cafedailycravings.in

ADMIN_EMAIL=admin@rusticbakes.com
ADMIN_PASSWORD=<strong password>

# Payments
STRIPE_API_KEY=sk_live_...       # or sk_test_...

# Email (optional)
RESEND_API_KEY=re_...
SENDER_EMAIL=orders@cafedailycravings.in
OWNER_EMAIL=orders@cafedailycravings.in

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# WhatsApp (optional)
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_GRAPH_VERSION=v18.0
OWNER_WHATSAPP_NUMBER=+918284990433
```

Save and exit.

## Step 5 — Launch 🚀

```bash
docker compose --profile prod up -d --build
```

That's it. Caddy will:
- Auto-request Let's Encrypt SSL for `cafedailycravings.in` (takes ~30 seconds)
- Route `/api/*` → FastAPI backend
- Route everything else → React frontend
- MongoDB stays private on the internal Docker network

Visit **https://cafedailycravings.in** — the site is live with HTTPS.

## Step 6 — Verify

```bash
docker compose ps        # all containers should be "Up"
docker compose logs -f backend | head -50
curl https://cafedailycravings.in/api/products
```

## Common Ops

**Restart a service:**
```bash
docker compose restart backend
docker compose restart frontend
```

**Update to latest code:**
```bash
git pull
docker compose --profile prod up -d --build
```

**Backup MongoDB:**
```bash
docker exec -it $(docker compose ps -q mongo) mongodump --archive=/tmp/bak.gz --gzip
docker cp $(docker compose ps -q mongo):/tmp/bak.gz ./backup-$(date +%F).gz
```

**Tail logs live:**
```bash
docker compose logs -f
```

## Troubleshooting

**"SSL certificate not issued"** → make sure ports 80 + 443 are open, and DNS has propagated (`dig cafedailycravings.in +short` returns your VPS IP).

**"Cannot connect to MongoDB"** → check backend logs; `docker compose restart backend` after Mongo is fully up.

**"Frontend loads but API fails"** → confirm `REACT_APP_BACKEND_URL` was set BEFORE the frontend built. Rebuild with:
```bash
docker compose build --no-cache frontend
docker compose up -d frontend
```

**"Cloudflare shows Error 522"** → in Cloudflare SSL/TLS settings, set **Full (strict)**. Add a Page Rule if needed.

---

## Post-launch checklist

- [ ] Sign in at `/admin/login` with your `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- [ ] Test the flow: browse → add to cart → checkout with card `4242 4242 4242 4242`
- [ ] Fill in real Resend, Cloudinary, WhatsApp keys in `backend/.env` and `docker compose restart backend`
- [ ] Verify Stripe webhook: `https://cafedailycravings.in/api/webhook/stripe` (add in Stripe → Developers → Webhooks)
- [ ] Test contact form → verify email arrives at `orders@cafedailycravings.com` and WhatsApp at `+918284990433`
- [ ] Set up nightly MongoDB backup with cron (see script above)

---

## Support

- Full API reference: `README.md`
- Design system: `design_guidelines.json`
- Any issues? Come back to Emergent chat and share the error — happy to debug.

Made with ♥ for Rustic Bakes by Daily Cravings.
