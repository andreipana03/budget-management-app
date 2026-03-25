# Budget Management App - Agent Reference

## Project Overview
Full-stack personal budget management app. React + TypeScript frontend, Node.js + Express backend, Supabase (PostgreSQL) database.

## Running the App
```bash
# Backend (terminal 1) - runs on port 5001
cd server && npm run dev

# Frontend (terminal 2) - runs on port 3000
cd client && npm run dev
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001/api
- Health check: http://localhost:5001/health

## Project Structure
```
budget-management-app/
├── client/src/
│   ├── App.tsx                    # Router, protected/public routes
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Tailwind base styles
│   ├── pages/
│   │   ├── Login.tsx              # Email/password + Google OAuth login
│   │   ├── Register.tsx           # Email/password + Google OAuth register
│   │   ├── AuthCallback.tsx       # OAuth redirect handler (/auth/callback)
│   │   ├── Dashboard.tsx          # Stats cards + recent transactions
│   │   ├── Transactions.tsx       # Full CRUD transactions table + modal
│   │   ├── Categories.tsx         # Expense/income tabs, color picker
│   │   ├── Budgets.tsx            # Monthly budgets with progress bars
│   │   └── Settings.tsx           # Theme, currency, date format, week start
│   ├── components/layout/
│   │   └── Layout.tsx             # Sidebar nav, theme toggle, sign out
│   ├── context/
│   │   ├── AuthContext.tsx        # Supabase auth state, signIn/signUp/signOut/Google
│   │   └── ThemeContext.tsx       # Light/dark theme, persisted to localStorage
│   ├── services/
│   │   ├── supabase.ts            # Supabase client (uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
│   │   └── api.ts                 # Axios instance with auto auth token injection
│   └── types/index.ts             # TypeScript interfaces: User, Category, Transaction, Budget, UserPreferences
│
├── server/src/
│   ├── index.ts                   # Express app, routes mount, cron for exchange rates
│   ├── middleware/
│   │   └── auth.ts                # JWT validation via Supabase, adds req.user
│   ├── routes/
│   │   ├── transactions.ts        # GET/POST/PUT/DELETE /api/transactions
│   │   ├── categories.ts          # GET/POST/PUT/DELETE /api/categories
│   │   ├── budgets.ts             # GET/POST/PUT/DELETE /api/budgets, GET /api/budgets/status/:year/:month
│   │   └── preferences.ts         # GET/PUT /api/preferences
│   └── services/
│       ├── supabase.ts            # Supabase admin client (uses SUPABASE_URL + SUPABASE_SERVICE_KEY)
│       └── exchangeRate.ts        # Fetch rates from exchangerate-api.com, upsert to DB, getExchangeRate()
│
└── supabase/
    ├── schema.sql                 # All tables, indexes, RLS policies, triggers
    ├── seed.sql                   # Default categories + preferences trigger (original)
    └── seed_fix.sql               # Fixed trigger with SECURITY DEFINER + SET search_path
```

## Environment Variables

### client/.env
```
VITE_SUPABASE_URL=https://zjrxjohszegcfgkhpfrq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:5001/api
```

### server/.env
```
PORT=5001
SUPABASE_URL=https://zjrxjohszegcfgkhpfrq.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
EXCHANGE_RATE_API_KEY=16087133d107b59d820fee7b
NODE_ENV=development
```

## Database Schema

### Tables
| Table | Key Columns |
|-------|-------------|
| `user_preferences` | user_id, theme, default_currency, date_format, week_start_day |
| `categories` | user_id, name, type (expense/income), color (hex), icon, is_default |
| `transactions` | user_id, category_id, amount, currency, converted_amount, date, description, is_recurring, recurrence_pattern |
| `budgets` | user_id, category_id, month, year, limit_amount — UNIQUE(user_id, category_id, month, year) |
| `exchange_rates` | base_currency, target_currency, rate, last_updated — UNIQUE(base_currency, target_currency) |

### RLS Policies
- All tables have RLS enabled
- Users can only CRUD their own rows (auth.uid() = user_id)
- exchange_rates: authenticated users can read; only service_role can write

### Auto-trigger on new user
When a user registers, `handle_new_user()` trigger fires and creates:
- 10 default expense categories (Food & Dining, Transportation, Shopping, Entertainment, Bills & Utilities, Healthcare, Education, Housing, Personal Care, Other)
- 6 default income categories (Salary, Freelance, Investments, Gifts, Refunds, Other)
- Default preferences (light theme, USD, MM/DD/YYYY, Sunday start)

**If trigger fails**: Run `supabase/seed_fix.sql` in Supabase SQL Editor.

## Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS (dark mode via `class` strategy, `dark:` prefix)
- React Router DOM v6 (BrowserRouter)
- @supabase/supabase-js (auth + realtime)
- Axios (API calls with auto Bearer token)
- Recharts (charts — installed but not yet used in pages)
- jsPDF + jspdf-autotable (PDF export — installed, not yet implemented)
- date-fns (date utilities — installed)
- lucide-react (icons)
- react-hook-form + zod (installed, not yet used)

### Backend
- Node.js + Express + TypeScript
- tsx watch (dev server with hot reload, loads .env via --env-file flag)
- @supabase/supabase-js (admin client with service key)
- node-cron (daily exchange rate update at midnight)
- axios (HTTP requests to exchange rate API)
- cors (all origins allowed in dev)
- dotenv (loaded via tsx --env-file=.env)

### External APIs
- exchangerate-api.com (free tier: 1,500 req/month) — API key in server/.env

## Key Patterns

### TypeScript Imports
All local imports MUST include `.tsx` or `.ts` extension:
```typescript
import { useAuth } from '../context/AuthContext.tsx';
import api from '../services/api.ts';
```
This is required because `tsconfig.json` has `"allowImportingTsExtensions": true`.

### Auth Flow
1. User logs in → Supabase sets session in localStorage
2. `AuthContext` listens to `onAuthStateChange`
3. `api.ts` interceptor reads session and adds `Authorization: Bearer <token>` to all requests
4. Backend `auth.ts` middleware validates token via `supabase.auth.getUser(token)`
5. `req.user.id` is available in all protected routes

### Google OAuth Flow
1. `signInWithGoogle()` redirects to Google with `redirectTo: window.location.origin + '/auth/callback'`
2. Google redirects back to `/auth/callback`
3. `AuthCallback.tsx` calls `supabase.auth.getSession()` and redirects to `/`
4. **Requires**: `http://localhost:3000/auth/callback` added to Supabase Auth → URL Configuration → Redirect URLs

### Currency Conversion
When creating/updating a transaction:
1. User selects any currency (USD/EUR/RON/etc.)
2. Backend fetches exchange rate from `exchange_rates` table
3. `converted_amount` is stored in user's default currency
4. All budget calculations use `converted_amount`

### Theme System
- `ThemeContext` adds/removes `dark` class on `<html>` element
- Tailwind uses `darkMode: 'class'` config
- Theme persisted to `localStorage`
- Settings page saves theme to `user_preferences` via API

## API Endpoints

### All routes require `Authorization: Bearer <token>` header

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/transactions | All user transactions with categories joined |
| GET | /api/transactions/:id | Single transaction |
| POST | /api/transactions | Create (auto-converts currency) |
| PUT | /api/transactions/:id | Update (re-converts currency) |
| DELETE | /api/transactions/:id | Delete |
| GET | /api/categories | All categories (optional ?type=expense\|income) |
| POST | /api/categories | Create custom category |
| PUT | /api/categories/:id | Update name/color/icon |
| DELETE | /api/categories/:id | Delete category |
| GET | /api/budgets | All budgets with categories joined |
| GET | /api/budgets/status/:year/:month | Budgets with spent/remaining/percentage |
| POST | /api/budgets | Create budget |
| PUT | /api/budgets/:id | Update limit_amount |
| DELETE | /api/budgets/:id | Delete budget |
| GET | /api/preferences | Get user preferences |
| PUT | /api/preferences | Update preferences |

## Known Issues & Fixes Applied

1. **Port conflict**: Port 5000 was in use → changed to 5001 in server/.env
2. **dotenv not loading**: tsx doesn't auto-load .env → fixed with `tsx watch --env-file=.env` in package.json
3. **CSS error**: `border-border` class doesn't exist → simplified index.css to use standard Tailwind classes
4. **TypeScript module resolution**: Must use `.tsx`/`.ts` extensions in all local imports
5. **Google OAuth redirect**: Was redirecting to origin → fixed to use `/auth/callback` route
6. **Signup trigger error**: "Database error saving new user" → run `supabase/seed_fix.sql` to fix trigger with proper SECURITY DEFINER

## Default Categories

### Expense (10)
Food & Dining (#EF4444), Transportation (#F59E0B), Shopping (#EC4899), Entertainment (#8B5CF6), Bills & Utilities (#3B82F6), Healthcare (#10B981), Education (#6366F1), Housing (#14B8A6), Personal Care (#F97316), Other (#6B7280)

### Income (6)
Salary (#10B981), Freelance (#3B82F6), Investments (#8B5CF6), Gifts (#EC4899), Refunds (#F59E0B), Other (#6B7280)

## Features NOT Yet Implemented
- Reports/Analytics page (charts, trends, CSV/PDF export)
- Recurring transactions UI (backend supports it via is_recurring + recurrence_pattern JSONB)
- Real-time sync (Supabase subscriptions available but not wired up)
- Budget alerts/notifications
- Transaction filtering/search on frontend
- Pagination

## Supabase Project
- Project URL: https://zjrxjohszegcfgkhpfrq.supabase.co
- Dashboard: https://app.supabase.com/project/zjrxjohszegcfgkhpfrq
