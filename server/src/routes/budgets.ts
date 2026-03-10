import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all budgets
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('budgets')
      .select('*, categories(*)')
      .eq('user_id', req.user!.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// Get budget status for a specific month
router.get('/status/:year/:month', authenticate, async (req: AuthRequest, res) => {
  try {
    const { year, month } = req.params;

    // Get budgets for the month
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('*, categories(*)')
      .eq('user_id', req.user!.id)
      .eq('year', parseInt(year))
      .eq('month', parseInt(month));

    if (budgetError) throw budgetError;

    // Get transactions for the month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('category_id, converted_amount, categories(type)')
      .eq('user_id', req.user!.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (transError) throw transError;

    // Calculate spending per category
    const spending: Record<string, number> = {};
    transactions?.forEach((t: any) => {
      if (t.categories?.type === 'expense') {
        spending[t.category_id] = (spending[t.category_id] || 0) + parseFloat(t.converted_amount);
      }
    });

    // Combine budget with spending
    const budgetStatus = budgets?.map((budget: any) => ({
      ...budget,
      spent: spending[budget.category_id] || 0,
      remaining: budget.limit_amount - (spending[budget.category_id] || 0),
      percentage: ((spending[budget.category_id] || 0) / budget.limit_amount) * 100,
    }));

    res.json(budgetStatus);
  } catch (error) {
    console.error('Error fetching budget status:', error);
    res.status(500).json({ error: 'Failed to fetch budget status' });
  }
});

// Create budget
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { category_id, month, year, limit_amount } = req.body;

    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: req.user!.id,
        category_id,
        month,
        year,
        limit_amount,
      })
      .select('*, categories(*)')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// Update budget
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { limit_amount } = req.body;

    const { data, error } = await supabase
      .from('budgets')
      .update({ limit_amount })
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select('*, categories(*)')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// Delete budget
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);

    if (error) throw error;

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

export default router;
