import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user preferences
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.put('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { theme, default_currency, date_format, week_start_day, savings_goal } = req.body;

    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        theme,
        default_currency,
        date_format,
        week_start_day,
        savings_goal: savings_goal !== undefined ? savings_goal : undefined,
      })
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
