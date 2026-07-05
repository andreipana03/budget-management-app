# Budget Management App

A full-stack personal finance app for tracking income, expenses, budgets, and savings goals — with multi-currency support, rich analytics, and AI-powered budget planning.

---

## What it does

**Transaction tracking** — log income and expenses with categories, dates, descriptions, and currencies. Transactions are automatically converted to your default currency using live exchange rates.

**Category management** — create custom expense and income categories with emoji icons and colors. A smart auto-emoji system suggests icons as you type. Deleting a category lets you either remove all its transactions or reassign them to "Others".

**Budget planning** — set monthly spending limits per category and track progress in real time. Three ways to create budgets:
- Manual — set limits yourself
- Custom (50/30/20) — auto-distribute income across Needs/Wants/Savings buckets with adjustable percentages
- AI Planner — a 5-question wizard powered by Google Gemini that generates a personalized budget based on your financial goals, lifestyle, and obligations

**Savings goal** — set a monthly savings target and track progress against income minus expenses.

**Dashboard analytics** — five chart types to visualize your finances:
- Spending/income by category (donut chart)
- Monthly income vs expenses trend
- Category spending trend over 6 months (stacked bar)
- Waterfall chart (this month's cash flow)
- Daily spend heatmap calendar

**Multi-currency** — supports USD, EUR, and RON. Exchange rates are fetched daily from exchangerate-api.com and stored in the database. All amounts are converted on the fly.

**Authentication** — email/password signup and Google OAuth, both handled by Supabase Auth.

**Themes** — light and dark mode, persisted per user.

---

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Recharts, Axios |
| Backend | Node.js, Express, TypeScript, Zod (validation), Helmet, express-rate-limit |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (email + Google OAuth) |
| AI | Google Gemini API (`gemini-flash-latest`) |
| Exchange rates | exchangerate-api.com (free tier) |

---

## Project structure

```
budget-management-app/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── pages/           # Dashboard, Transactions, Categories, Budgets, Login, Register
│       ├── components/      # TransactionModal, AutoBudgetWizard, charts, CategoryIcon, IconPicker
│       ├── context/         # AuthContext, ThemeContext, PreferencesContext
│       ├── services/        # Supabase client, Axios API instance
│       ├── types/           # TypeScript interfaces
│       └── utils/           # autoEmoji utility
├── server/                  # Express backend
│   └── src/
│       ├── routes/          # transactions, categories, budgets, preferences, exchangeRates, ai
│       ├── middleware/       # JWT auth middleware
│       └── services/        # Supabase admin client, exchange rate fetcher
└── supabase/                # SQL schema, seed, and migration files
```

---

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Google Gemini API key](https://aistudio.google.com) (free tier works)
- An [exchangerate-api.com](https://exchangerate-api.com) API key (free tier: 1,500 req/month)

### 1. Database setup

In your Supabase project's SQL Editor, run these files in order:

1. `supabase/schema.sql` — creates all tables, indexes, and RLS policies
2. `supabase/seed.sql` — creates the trigger that seeds default categories and preferences for new users
3. `supabase/seed_fix.sql` — patches the trigger with `SECURITY DEFINER` (required to avoid permission errors)
4. `supabase/migration_add_savings_goal.sql` — adds the `savings_goal` column

For Google OAuth: in Supabase → Authentication → Providers, enable Google and add your OAuth credentials. Add `http://localhost:5173/auth/callback` to the redirect URLs.

### 2. Install dependencies

```bash
# Frontend
cd client && npm install

# Backend
cd server && npm install
```

### 3. Configure environment variables

**`client/.env`**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5001/api
```

**`server/.env`**
```env
PORT=5001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
```

### 4. Run the app

```bash
# Terminal 1 — backend (port 5001)
cd server && npm run dev

# Terminal 2 — frontend (port 5173)
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Default categories

Every new user gets these seeded automatically on first signup.

**Expenses:** Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Education, Housing, Personal Care, Others

**Income:** Salary, Freelance, Investments, Gifts, Refunds, Others

---

## License

MIT
