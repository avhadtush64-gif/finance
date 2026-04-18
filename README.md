# Personal Finance Tracker

A full-featured personal finance management API built with **Node.js**, **Express**, and **PostgreSQL**, with a minimal HTML/CSS/JS frontend for demo purposes.

## Features

- **Authentication**: JWT (access + refresh tokens) + Google OAuth 2.0
- **Transactions**: Full CRUD with pagination, filtering, sorting, multi-currency support
- **Categories**: System defaults + custom user categories
- **Budgets**: Category budgets with period tracking and overspend alerts
- **Dashboard**: Aggregated financial summary, charts, trends
- **Reports**: Monthly reports, date-range queries, CSV export
- **Multi-Currency**: Live exchange rates with 1-hour caching
- **Receipt Uploads**: Image/PDF upload per transaction (Multer)
- **Email Notifications**: Budget warning/overrun alerts via Nodemailer
- **Security**: Helmet, CORS, rate limiting, bcrypt, parameterized queries

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL (via `pg`) |
| Auth | JWT + bcrypt + Passport.js (Google OAuth) |
| File Upload | Multer (local disk) |
| Email | Nodemailer (SMTP) |
| Currency | exchangerate-api.com |
| Frontend | Vanilla HTML/CSS/JS + Chart.js |

---

## Project Structure

```
/src
  /config         → db.js, passport.js, env validation
  /controllers    → auth, categories, transactions, budgets, dashboard, reports, currencies
  /middleware     → auth (JWT verify), errorHandler, validate, upload (multer)
  /models         → migrate.js (SQL schema), seed.js (default data)
  /routes         → index.js, auth.js, transactions.js, budgets.js, reports.js, categories.js
  /services       → emailService.js, currencyService.js, notificationService.js
  /utils          → errors.js, helpers.js, constants.js
/public           → index.html, style.css, app.js (frontend demo)
/uploads          → receipt storage (gitignored)
.env.example      → environment variable template
```

---

## Setup Instructions

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14

### 1. Clone & Install

```bash
git clone <repo-url>
cd personal-finance-tracker
npm install
```

### 2. Database Setup

```sql
CREATE DATABASE finance_tracker;
```

### 3. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

**Required variables:**
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Random secret for access tokens
- `JWT_REFRESH_SECRET` — Random secret for refresh tokens

**Optional variables:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — For Google OAuth
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` — For email notifications
- `EXCHANGE_RATE_API_KEY` — For live exchange rates (falls back to 1:1)

### 4. Run Migrations & Seed

```bash
npm run migrate    # Creates all tables
npm run seed       # Seeds default categories
```

### 5. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Visit `http://localhost:3000`

---

## API Documentation

### Health Check

```
GET /api/health → { status: "ok", timestamp: "..." }
```

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (name, email, password) |
| POST | `/api/auth/login` | Login (email, password) |
| POST | `/api/auth/refresh` | Refresh access token (uses httpOnly cookie) |
| POST | `/api/auth/logout` | Clear refresh token cookie |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/me` | Get current user profile |
| PATCH | `/api/auth/me` | Update profile (name, preferred_currency) |
| DELETE | `/api/auth/me` | Delete account + all data |

**Register example:**
```json
POST /api/auth/register
{ "name": "John", "email": "john@example.com", "password": "securepass" }
→ { "success": true, "data": { "user": {...}, "accessToken": "..." } }
```

### Transactions (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List (paginated, filterable) |
| POST | `/api/transactions` | Create (with optional receipt upload) |
| PATCH | `/api/transactions/:id` | Update |
| DELETE | `/api/transactions/:id` | Delete (hard delete) |
| POST | `/api/transactions/:id/receipt` | Upload receipt |
| DELETE | `/api/transactions/:id/receipt` | Remove receipt |

**Query params:** `?type=income|expense&category_id=&start_date=&end_date=&page=&limit=&sort=date|amount`

### Categories (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List user's + system categories |
| POST | `/api/categories` | Create custom category |
| PATCH | `/api/categories/:id` | Update |
| DELETE | `/api/categories/:id` | Delete (409 if transactions exist, `?force=true` to reassign) |

### Budgets (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budgets` | List all with current spend % |
| POST | `/api/budgets` | Create budget for category+period |
| GET | `/api/budgets/:id/progress` | Detailed progress |
| PATCH | `/api/budgets/:id` | Update |
| DELETE | `/api/budgets/:id` | Delete |

### Dashboard (auth required)

```
GET /api/dashboard → { summary, expenses_by_category, income_by_source, monthly_trend, top_transactions, budget_alerts }
```

### Reports (auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/monthly?year=2024&month=3` | Monthly breakdown |
| GET | `/api/reports/range?start_date=&end_date=` | Date range report |
| GET | `/api/reports/export?format=csv&start_date=&end_date=` | CSV download |

### Currencies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/currencies/supported` | List supported codes |
| GET | `/api/currencies/rate?from=USD&to=INR` | Get exchange rate |

---

## Database Schema

### Tables

1. **users** — id (UUID), name, email (unique), password_hash, google_id, avatar_url, preferred_currency, timestamps
2. **categories** — id (UUID), user_id (FK), name, type (income|expense), color, icon, is_system, created_at
3. **transactions** — id (UUID), user_id (FK), category_id (FK), type, amount, currency, amount_in_preferred, exchange_rate, description, date, receipt_url, is_refund, timestamps
4. **budgets** — id (UUID), user_id (FK), category_id (FK), amount, currency, period (monthly|weekly|yearly), start_date, end_date, notify_at_percent, created_at
5. **income_sources** — id (UUID), user_id (FK), name, description, created_at
6. **notifications_log** — id (UUID), user_id (FK), type, message, sent_at

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | Raw `pg` with parameterized queries | Full SQL control, zero SQL injection risk, lighter than Sequelize |
| Delete strategy | **Hard delete** for transactions | Simpler for personal use; no soft-delete complexity |
| Category deletion | 409 Conflict + `?force=true` | Prevents accidental data loss; force reassigns to "Uncategorized" |
| FX rate caching | In-memory Map with 1hr TTL | No Redis dependency; sufficient for single-instance |
| File storage | Local disk `/uploads/{userId}/` | Simple; easy to swap for Cloudinary |
| Refresh token | httpOnly cookie (stateless) | Simpler than DB-stored tokens; good security for SPAs |
| Password hashing | bcrypt with saltRounds=12 | Industry standard; 12 rounds balance security & speed |

---

## Error Response Format

All errors return:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [...]
  }
}
```

HTTP status codes used: 400, 401, 403, 404, 409, 422, 500

---

## Known Limitations

- Refresh tokens are stateless (no server-side revocation list)
- Exchange rate API has a free-tier limit; falls back to 1:1 without API key
- Email notifications require SMTP credentials; logs to console without them
- No WebSocket real-time updates
- Frontend is minimal/demo quality — not production UI
- Single-instance only (in-memory FX cache doesn't share across processes)

---

## License

ISC
