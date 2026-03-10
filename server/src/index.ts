import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import cron from 'node-cron';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import budgetsRouter from './routes/budgets';
import preferencesRouter from './routes/preferences';
import { updateExchangeRates } from './services/exchangeRate';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Budget API is running' });
});

// API routes
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Budget Management API v1.0',
    endpoints: {
      transactions: '/api/transactions',
      categories: '/api/categories',
      budgets: '/api/budgets',
      preferences: '/api/preferences',
    }
  });
});

// Mount API routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/budgets', budgetsRouter);
app.use('/api/preferences', preferencesRouter);

// Update exchange rates daily at midnight
cron.schedule('0 0 * * *', () => {
  console.log('🔄 Running daily exchange rate update...');
  updateExchangeRates();
});

// Update exchange rates on startup
updateExchangeRates();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`💱 Exchange rates will update daily at midnight`);
});
