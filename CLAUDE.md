# Budget Management App — Agent Context

## What this app is

Full-stack personal finance app. React + TypeScript frontend, Node.js + Express backend, Supabase (PostgreSQL) database. Users track income/expenses, set monthly budgets, and get AI-generated budget plans via Google Gemini.

---

## Running the app

```bash
# Backend — port 5001
cd server && npm run dev

# Frontend — port 5173
cd client && npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5001/api
- Health check: http://localhost:5001/health

---

## Project structure

```
budget-management-app/
├── client/src/
│   ├── App.tsx                          # Router setup, ProtectedRoute, PublicRoute
│   ├── main.tsx                         # Entry point
│   ├── index.css                        # Tailwind base styles
│   ├── pages/
│   │   ├── Login.tsx                    # Email/password + Google OAuth login
│   │   ├── Register.tsx                 # Email/password + Google OAuth register
│   │   ├── AuthCallback.tsx             # OAuth redirect handler (/auth/callback)
│   │   ├── Dashboard.tsx                # Stats cards + 5 chart types + recent transactions
│   │   ├── Transactions.tsx             # Full CRUD table with type/category/date filters
│   │   ├── Categories.tsx               # Expense/income tabs, color picker, icon picker, auto-emoji
│   │   └── Budgets.tsx                  # Monthly budgets with progress bars, savings goal, auto-budget
│   ├── components/
│   │   ├── layout/Layout.tsx            # Sidebar nav, theme toggle, sign out
│   │   ├── transactions/TransactionModal.tsx  # Add/edit transaction modal
│   │   ├── budgets/AutoBudgetWizard.tsx # 5-question AI budget wizard (Gemini)
│   │   ├── categories/CategoryIcon.tsx  # Renders emoji or colored circle icon
│   │   ├── categories/IconPicker.tsx    # Emoji picker for categories
│   │   └── charts/
│   │       ├── MonthlyTrendChart.tsx    # Bar chart: income vs expenses by month
│   │       ├── StackedCategoryChart.tsx # Stacked bar: category spending last 6 months
│   │       ├── WaterfallChart.tsx       # Waterfall: this month's cash flow
│   │       └── HeatmapCalendar.tsx      # Calendar heatmap: daily spend intensity
│   ├── context/
│   │   ├── AuthContext.tsx              # Supabase auth state, signIn/signUp/signOut/Google
│   │   ├── ThemeContext.tsx             # Light/dark theme, persisted to localStorage
│   │   └── PreferencesContext.tsx       # Currency, exchange rates, convert(), fmt(), savingsGoal
│   ├── services/
│   │   ├── supabase.ts                  # Supabase client (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
│   │   └── api.ts                       # Axios instance with auto Bearer token injection
│   ├── types/index.ts                   # TypeScript interfaces: User, Category, Transaction, Budget, UserPreferences
│   └── utils/autoEmoji.ts              # Suggests emoji from category name keywords
│
├── server/src/
│   ├── index.ts                         # Express app: helmet, CORS, rate limiting, body limit, routes, cron
│   ├── middleware/auth.ts               # JWT validation via supabase.auth.getUser(), sets req.user
│   ├── routes/
│   │   ├── transactions.ts              # GET/POST/PUT/DELETE — Zod validated, UUID param checks
│   │   ├── categories.ts                # GET/POST/PUT/DELETE — validates type enum, hex color, icon length
│   │   ├── budgets.ts                   # GET/POST/PUT/DELETE + GET /status/:year/:month
│   │   ├── preferences.ts               # GET/PUT — validates theme, currency, date_format, week_start_day, savings_goal
│   │   ├── exchangeRates.ts             # GET — returns nested rate map { USD: { EUR: 0.92, ... } }
│   │   └── ai.ts                        # POST /budget-suggestion — Gemini AI, rate limited 5/min, prompt sanitized
│   └── services/
│       ├── supabase.ts                  # Supabase admin client (SUPABASE_URL + SUPABASE_SERVICE_KEY)
│       └── exchangeRate.ts              # Fetches from exchangerate-api.com, upserts to DB, getExchangeRate()
│
└── supabase/
    ├── schema.sql                       # All tables, indexes, RLS policies, updated_at triggers
    ├── seed.sql                         # handle_new_user() trigger: seeds default categories + preferences
    ├── seed_fix.sql                     # Patches trigger with SECURITY DEFINER + SET search_path (run this)
    └── migration_add_savings_goal.sql   # Adds savings_goal column to user_preferences
```

---

## Environment variables

### client/.env
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:5001/api
```

### server/.env
```
PORT=5001
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  ← service_role key, never expose to client
EXCHANGE_RATE_API_KEY=...
GEMINI_API_KEY=...
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Database schema

### Tables

| Table | Key columns |
|---|---|
| `user_preferences` | user_id, theme (light/dark), default_currency, date_format, week_start_day, savings_goal |
| `categories` | user_id, name, type (expense/income), color (hex), icon (emoji), is_default |
| `transactions` | user_id, category_id, amount, currency, converted_amount, date, description, is_recurring, recurrence_pattern (JSONB) |
| `budgets` | user_id, category_id, month, year, limit_amount — UNIQUE(user_id, category_id, month, year) |
| `exchange_rates` | base_currency, target_currency, rate — UNIQUE(base_currency, target_currency) |

### RLS
All tables have RLS enabled. Every policy uses `auth.uid() = user_id`. Exchange rates: authenticated users can read; only service_role can write.

### New user trigger
`handle_new_user()` fires on `auth.users` INSERT and creates:
- 10 default expense categories (Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Education, Housing, Personal Care, Others)
- 6 default income categories (Salary, Freelance, Investments, Gifts, Refunds, Others)
- Default preferences (light theme, USD, MM/DD/YYYY, Sunday start)

**If trigger fails on signup:** run `supabase/seed_fix.sql` in Supabase SQL Editor.

---

## API endpoints

All routes require `Authorization: Bearer <supabase_access_token>`.

| Method | Path | Description |
|---|---|---|
| GET | /api/transactions | All user transactions with categories joined |
| GET | /api/transactions/:id | Single transaction |
| POST | /api/transactions | Create (validates input, auto-converts currency) |
| PUT | /api/transactions/:id | Update (re-converts currency) |
| DELETE | /api/transactions/:id | Delete |
| GET | /api/categories | All categories (optional `?type=expense\|income`) |
| POST | /api/categories | Create custom category |
| PUT | /api/categories/:id | Update name/color/icon (cannot edit "Others") |
| DELETE | /api/categories/:id | Delete (`?mode=with_transactions\|reassign`) |
| GET | /api/budgets | All budgets with categories joined |
| GET | /api/budgets/status/:year/:month | Budgets with spent/remaining/percentage for a month |
| POST | /api/budgets | Create budget |
| PUT | /api/budgets/:id | Update limit_amount |
| DELETE | /api/budgets/:id | Delete budget |
| GET | /api/preferences | Get user preferences |
| PUT | /api/preferences | Update preferences |
| GET | /api/exchange-rates | Nested rate map `{ USD: { EUR: 0.92 } }` |
| POST | /api/ai/budget-suggestion | AI budget plan (5 req/min rate limit) |

---

## Key patterns

### TypeScript imports
All local imports must include `.tsx` or `.ts` extension — required by `tsconfig.json` (`"allowImportingTsExtensions": true`):
```typescript
import { useAuth } from '../context/AuthContext.tsx';
import api from '../services/api.ts';
```

### Auth flow
1. User logs in → Supabase sets session in localStorage
2. `AuthContext` listens to `onAuthStateChange`
3. `api.ts` interceptor reads session and adds `Authorization: Bearer <token>` to every request
4. `auth.ts` middleware validates token via `supabase.auth.getUser(token)`
5. `req.user.id` is available in all protected routes

### Google OAuth flow
1. `signInWithGoogle()` calls `supabase.auth.signInWithOAuth` with `redirectTo: window.location.origin + '/auth/callback'`
2. `AuthCallback.tsx` calls `supabase.auth.getSession()` and redirects to `/`
3. Requires `http://localhost:5173/auth/callback` in Supabase → Auth → URL Configuration → Redirect URLs

### Currency conversion
- User selects a currency when creating a transaction
- Backend fetches the exchange rate from the `exchange_rates` table
- `converted_amount` is stored in the user's default currency
- All budget calculations and chart aggregations use `converted_amount`
- `PreferencesContext` exposes `convert(amount, fromCurrency)` and `fmt(amount)` for the frontend

### Theme system
- `ThemeContext` adds/removes `dark` class on `<html>`
- Tailwind uses `darkMode: 'class'`
- Theme persisted to `localStorage`

### Input validation (server)
All routes use Zod schemas. Every UUID param, enum value, number range, and string length is validated before touching the DB. Invalid input returns `400` with `{ error, details }`.

### Security measures applied
- `helmet` — sets security HTTP headers
- `cors` — restricted to `ALLOWED_ORIGINS` env var
- `express-rate-limit` — 200 req/15min global; 5 req/min on AI endpoint
- Body size limit: `express.json({ limit: '50kb' })`
- Prompt injection sanitization on AI route
- No raw DB/Supabase errors returned to clients

---

## AI budget wizard (AutoBudgetWizard)

Located at `client/src/components/budgets/AutoBudgetWizard.tsx`. Flow:
1. User answers 5 multiple-choice questions (financial goal, savings priority, lifestyle, dependents, big expenses)
2. Frontend POSTs to `/api/ai/budget-suggestion` with answers + categories + monthlyIncome + currency
3. Server sanitizes inputs, builds a prompt, calls Gemini `gemini-flash-latest`
4. Response is parsed JSON with `allocations[]`, `savings_goal`, `savings_reasoning`, `overall_advice`
5. User can edit amounts before applying
6. Applying upserts budgets and saves the savings goal to preferences

---

## Supported currencies

USD, EUR, RON — enforced by Zod enums on all routes. Exchange rates are updated daily at midnight via `node-cron`.

---

## Known issues / gotchas

- Exchange rate free tier: 1,500 req/month. With 3 base currencies × 3 targets × daily updates = ~9 req/day, well within limits.
- Gemini free tier: 10 req/min, daily quota varies. The AI route returns specific error messages for quota exhaustion.
- `recurrence_pattern` is stored as JSONB but recurring transaction generation is not yet implemented in the UI.
- The `savedCurrency` value in `PreferencesContext` is the currency loaded from the DB on login. `currency` is the currently selected display currency (can differ until saved).
