import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getExchangeRate } from '../services/exchangeRate';

const router = Router();

// Get all transactions
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('user_id', req.user!.id)
      .order('date', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create transaction
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { category_id, amount, currency, date, description, is_recurring, recurrence_pattern } = req.body;

    // Get user's default currency
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('default_currency')
      .eq('user_id', req.user!.id)
      .single();

    const defaultCurrency = preferences?.default_currency || 'USD';

    // Convert amount to default currency
    const exchangeRate = await getExchangeRate(currency, defaultCurrency);
    const convertedAmount = amount * exchangeRate;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: req.user!.id,
        category_id,
        amount,
        currency,
        converted_amount: convertedAmount,
        date,
        description,
        is_recurring: is_recurring || false,
        recurrence_pattern: recurrence_pattern || null,
      })
      .select('*, categories(*)')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Update transaction
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { category_id, amount, currency, date, description, is_recurring, recurrence_pattern } = req.body;

    // Get user's default currency
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('default_currency')
      .eq('user_id', req.user!.id)
      .single();

    const defaultCurrency = preferences?.default_currency || 'USD';

    // Convert amount to default currency
    const exchangeRate = await getExchangeRate(currency, defaultCurrency);
    const convertedAmount = amount * exchangeRate;

    const { data, error } = await supabase
      .from('transactions')
      .update({
        category_id,
        amount,
        currency,
        converted_amount: convertedAmount,
        date,
        description,
        is_recurring,
        recurrence_pattern,
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select('*, categories(*)')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Delete transaction
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);

    if (error) throw error;

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
