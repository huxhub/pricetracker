# 🚀 Multi-Platform Price Comparison & Alert System

A production-ready web application built to monitor, compare, and alert on product prices across multiple e-commerce platforms (**Amazon**, **Flipkart**, **Meesho**, and extensible for any future marketplaces).

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express.js, REST APIs, JWT Authentication
- **Database**: MySQL 8.0 (Connection pooling, auto-migration, relational schema)
- **Scraping**: Playwright Chromium + Cheerio with anti-bot evasion heuristics & fallback resilience
- **Scheduler**: `node-cron` with interval checks (`next_check_at <= NOW() AND status = 'ACTIVE'`)
- **Alert Engine**: Nodemailer (HTML price drop & target price templates with duplicate suppression)

---

## 📂 Project Architecture

```
American_Tourister/
├── backend/
│   ├── src/
│   │   ├── config/             # MySQL connection pool & environment config
│   │   ├── controllers/        # Auth, Products, ProductLinks, Prices, Alerts, Admin
│   │   ├── middleware/         # JWT Auth, Admin guard, Central error handler
│   │   ├── routes/             # Clean REST route handlers
│   │   ├── services/           # Product, Price, Alert, Email, Platform, Scraper services
│   │   ├── scrapers/           # Extensible Scraper Registry & platform adapters
│   │   │   ├── base/           # BaseScraper abstract class & standard ProductData
│   │   │   ├── amazon/         # Amazon adapter
│   │   │   ├── flipkart/       # Flipkart adapter
│   │   │   ├── meesho/         # Meesho adapter
│   │   │   └── scraper.registry.js
│   │   ├── jobs/               # node-cron price monitoring job
│   │   ├── utils/              # Price calculation, URL normalization, Brand extraction
│   │   ├── app.js              # Express app with Helmet, CORS, and Rate Limiting
│   │   └── server.js           # Server bootstrap
│   └── scripts/
│       ├── init-db.js          # Database creation & table verification
│       └── test-e2e.js         # Complete automated end-to-end test
│
└── frontend/
    └── src/
        ├── app/
        │   ├── dashboard/      # Stat cards & recent price changes
        │   ├── products/       # Tracked catalog with lowest price highlight
        │   ├── products/add/   # Multi-URL paste with auto platform detection
        │   ├── products/[id]/  # Comparison table, SVG price history chart, alert modal
        │   ├── alerts/         # Active price alerts management
        │   ├── admin/          # Platform adapters & audit scrape logs
        │   ├── login/ & register/ # Auth screens with 1-click Demo credentials
        │   └── settings/       # Profile & notification delivery rules
        ├── components/         # PlatformBadge, PriceComparison, PriceChart, ProductCard, AlertModal
        ├── services/           # Centralized API client with JWT interceptor
        └── lib/                # React AuthProvider and useAuth hook
```

---

## ⚡ Quick Start

### 1. Database Setup
The backend automatically connects to MySQL and creates the `price_tracker_db` database and all 7 tables upon launch.
To run the initializer manually:
```bash
cd backend
npm run init-db
```

### 2. Run Backend Server
```bash
cd backend
npm run dev
```
Backend runs at `http://localhost:5000` with automated health check at `http://localhost:5000/api/health`.

### 3. Run Frontend
```bash
cd frontend
npm run dev
```
Frontend runs at `http://localhost:3000`.

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@pricetracker.com` | `admin123` |
| **Demo User** | `user@pricetracker.com` | `user123` |

*(1-click login buttons are also built directly into the `/login` screen)*

---

## 🧪 Automated End-to-End Test

To run the complete verification suite (multi-URL scraping, cross-platform lowest price computation, price history analytics, price drop alerts, and scrape log auditing):
```bash
cd backend
node scripts/test-e2e.js
```
