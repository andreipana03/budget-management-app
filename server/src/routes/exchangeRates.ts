import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate } from '../middleware/auth';

const router = Router();

// Return all exchange rates as a nested map: { USD: { EUR: 0.92, RON: 4.55, ... }, ... }
router.get('/', authenticate, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('base_currency, target_currency, rate');

    if (error) throw error;

    const map: Record<string, Record<string, number>> = {};
    for (const row of data ?? []) {
      if (!map[row.base_currency]) map[row.base_currency] = {};
      map[row.base_currency][row.target_currency] = parseFloat(row.rate);
    }

    res.json(map);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

export default router;
