# 🚀 Deployment Guide: Vercel Frontend + DigitalOcean Backend

This guide details the exact process to deploy:
- **Backend API (`pricetrackerapi.uxhub.in`)**: On your DigitalOcean Ubuntu 24.04 Droplet (`64.227.177.179`) with PM2, MySQL, Nginx, Playwright & SSL.
- **Frontend (`pricetracker.uxhub.in`)**: On Vercel (Next.js serverless).

---

## 🧭 Architecture Summary

```
[ User Browser ]
       │
       ├──► https://pricetracker.uxhub.in ──────► Vercel (Next.js)
       │                                                │
       │    (API Requests via fetch)                    │
       │                                                ▼
       └──► https://pricetrackerapi.uxhub.in ───► DigitalOcean Droplet (64.227.177.179)
                                                        │
                                                        ▼
                                                  Nginx (:80/:443)
                                                        │ (Reverse proxy)
                                                        ▼
                                                  Node.js Express (:5050)
                                                        │
                                                        ├── MySQL (localhost:3306)
                                                        └── Playwright Chromium (Scraping)
```

---

## PART 1: Deploy Backend to DigitalOcean Droplet

### Step 1.1: DNS A Record for Backend API
In your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.):
- **Type**: `A`
- **Name / Host**: `pricetrackerapi`
- **Target IP**: `64.227.177.179`
- **Proxy Status**: DNS Only (if using Cloudflare, turn proxy off so Certbot can issue SSL)

---

### Step 1.2: Upload Backend Files from Local Machine

In your Windows PowerShell locally:

```powershell
cd "c:\Users\ROHITH\Documents\Startup\Web Development\American_Tourister"

# Create a clean archive of backend & PM2 config (excluding node_modules)
tar --exclude="backend/node_modules" -czvf backend.tar.gz backend ecosystem.config.cjs

# Upload to Droplet
scp backend.tar.gz root@64.227.177.179:/tmp/
```

---

### Step 1.3: Extract on Droplet

SSH into your Droplet:
```bash
ssh root@64.227.177.179
```

Extract files:
```bash
mkdir -p /var/www/pricetracker
tar -xzvf /tmp/backend.tar.gz -C /var/www/pricetracker
cd /var/www/pricetracker
```

---

### Step 1.4: Configure MySQL Database

Open MySQL shell:
```bash
mysql -u root -p
```
*(If no password is configured for root on Ubuntu, just run `mysql`)*.

Run the SQL commands to create database and user:
```sql
CREATE DATABASE IF NOT EXISTS price_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'pricetracker'@'localhost' IDENTIFIED BY 'PriceTracker2026Secure!';
GRANT ALL PRIVILEGES ON price_tracker.* TO 'pricetracker'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

### Step 1.5: Configure Backend `.env`

```bash
cd /var/www/pricetracker/backend
nano .env
```

Paste the production configuration:
```env
PORT=5050
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=pricetracker
DB_PASSWORD=PriceTracker2026Secure!
DB_NAME=price_tracker
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://pricetracker.uxhub.in,http://pricetracker.uxhub.in

MONITORING_INTERVAL_HOURS=24
MONITOR_CRON_SCHEDULE=0 * * * *

SCRAPING_TIMEOUT_MS=30000
HEADLESS_BROWSER=true

SCRAPFLY_API_KEY=scp-live-b8bc5ea56d584b4987b6b97aef3c6eb2

SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Price Alert <alerts@pricetracker.local>
```
Press `Ctrl+O` &rarr; `Enter` &rarr; `Ctrl+X` to save and exit.

---

### Step 1.6: Install Dependencies & Playwright Browser

```bash
cd /var/www/pricetracker/backend
npm install

# Crucial step: Installs Chromium binary and all Ubuntu shared libraries (libnss, libasound, libgbm, etc.)
npx playwright install --with-deps chromium
```

---

### Step 1.7: Start Backend with PM2

```bash
cd /var/www/pricetracker
pm2 start ecosystem.config.cjs
pm2 save
```

Verify PM2 status:
```bash
pm2 status
```
Test health check locally:
```bash
curl http://localhost:5050/api/health
```
*(Should return: `{"status":"healthy",...}`)*

---

### Step 1.8: Configure Nginx Reverse Proxy

Create site configuration:
```bash
nano /etc/nginx/sites-available/pricetrackerapi.conf
```

Paste:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name pricetrackerapi.uxhub.in;

    client_max_body_size 25M;
    proxy_read_timeout 300s;
    proxy_connect_timeout 300s;

    location / {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

Enable the configuration and reload Nginx:
```bash
ln -s /etc/nginx/sites-available/pricetrackerapi.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

### Step 1.9: Install SSL Certificate with Certbot

Run:
```bash
certbot --nginx -d pricetrackerapi.uxhub.in
```
Follow the prompt. When completed, verify from your browser:
**https://pricetrackerapi.uxhub.in/api/health** &rarr; `{ "status": "healthy" }`

---

## PART 2: Deploy Frontend to Vercel

### Step 2.1: Set Environment Variable in Vercel
In your Vercel Dashboard for this project:
1. Go to **Settings** &rarr; **Environment Variables**.
2. Add a new variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://pricetrackerapi.uxhub.in/api`
   - **Target**: Production, Preview, Development
3. Click **Save**.

*(Note: If deploying via the Vercel UI from a Git repository containing both frontend and backend, make sure **Root Directory** in Vercel project settings is set to `frontend`)*.

---

### Step 2.2: Add Custom Domain in Vercel
1. In Vercel, go to **Settings** &rarr; **Domains**.
2. Add: `pricetracker.uxhub.in`.
3. Vercel will show the required DNS record:
   - **Type**: `CNAME`
   - **Name**: `pricetracker`
   - **Value**: `cname.vercel-dns.com`
4. Add that CNAME record to your DNS provider.

---

### Step 2.3: Redeploy on Vercel
Trigger a redeployment on Vercel so that `NEXT_PUBLIC_API_URL` is baked into the build.

Visit **https://pricetracker.uxhub.in** to verify:
- Log in with default admin credentials:
  - **Email**: `admin@pricetracker.com`
  - **Password**: `admin123`
- Add products and start tracking prices!
