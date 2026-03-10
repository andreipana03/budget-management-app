# Budget Management App

A modern, full-stack personal budget management application built with React, TypeScript, Node.js, and Supabase.

## Features

- 🔐 Authentication (Email/Password + Google OAuth)
- 💰 Income & Expense Tracking
- 📊 Multiple Currency Support with Live Exchange Rates
- 📈 Budget Limits & Goals per Category
- 📉 Analytics & Reports (Charts, Trends, Summaries)
- 🔄 Recurring Transactions
- 📱 Real-time Sync Across Devices
- 🎨 Modern Minimalist Design
- 🌓 Light & Dark Themes
- 📤 Export to CSV & PDF

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts (Charts)
- Supabase Client

### Backend
- Node.js + Express
- TypeScript
- Supabase (PostgreSQL)
- Node-cron (Scheduled Tasks)

## Project Structure

```
budget-app/
├── client/          # React frontend
├── server/          # Node.js backend
├── supabase/        # Database schema & migrations
├── PLAN.md          # Detailed implementation plan
└── SUPABASE_SETUP.md # Database setup guide
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Exchange Rate API key (optional, for live rates)

### 1. Database Setup

Follow the comprehensive guide in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to:
- Create a Supabase project
- Set up authentication (Email + Google OAuth)
- Create database schema
- Seed default data
- Get your API keys

### 2. Install Dependencies

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 3. Configure Environment Variables

**Client** (`client/.env`):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api
```

**Server** (`server/.env`):
```env
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
NODE_ENV=development
```

### 4. Run the Application

```bash
# Terminal 1 - Start backend server
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Categories

### Expenses
- Food & Dining 🍔
- Transportation 🚗
- Shopping 🛍️
- Entertainment 🎬
- Bills & Utilities 💡
- Healthcare 🏥
- Education 📚
- Housing 🏠
- Personal Care 💅
- Other 📦

### Income
- Salary 💼
- Freelance 💻
- Investments 📈
- Gifts 🎁
- Refunds 💰
- Other 📦

## User Preferences

- Theme: Light/Dark mode
- Default Currency: USD, EUR, RON, etc.
- Date Format: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
- Week Start Day: Sunday-Saturday

## Development

### Build for Production

```bash
# Build client
cd client
npm run build

# Build server
cd server
npm run build
```

### Deployment

See [PLAN.md](./PLAN.md) for AWS deployment instructions (free tier).

## License

MIT

## Support

For issues and questions, please refer to:
- [PLAN.md](./PLAN.md) - Detailed implementation plan
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Database setup guide