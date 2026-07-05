import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  default_currency: z.enum(['USD', 'EUR', 'RON']).optional(),
  date_format: z.string().max(20).optional(),
  week_start_day: z.number().int().min(0).max(6).optional(),
  savings_goal: z.number().nonnegative().max(1_000_000_000).optional().nullable(),
});

// Get user preferences
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', req.user!.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parse = preferencesSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten().fieldErrors });
  }

  try {
    const updates = Object.fromEntries(
      Object.entries(parse.data).filter(([, v]) => v !== undefined)
    );

    const { data, error } = await supabase
      .from('user_preferences')
      .update(updates)
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
