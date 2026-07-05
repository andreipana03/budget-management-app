import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const categoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['expense', 'income']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(10).optional(),
});

const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(10).optional(),
});

// Get all categories
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const typeParam = req.query.type;
    const type = z.enum(['expense', 'income']).optional().safeParse(typeParam);
    if (!type.success) return res.status(400).json({ error: 'Invalid type filter' });

    let query = supabase
      .from('categories')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('name');

    if (type.data) {
      query = query.eq('type', type.data);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parse = categoryCreateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten().fieldErrors });
  }

  try {
    const { name, type, color, icon } = parse.data;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: req.user!.id,
        name,
        type,
        color: color || '#3B82F6',
        icon: icon || '',
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const idParse = z.string().uuid().safeParse(req.params.id);
  if (!idParse.success) return res.status(400).json({ error: 'Invalid category ID' });

  const parse = categoryUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input', details: parse.error.flatten().fieldErrors });
  }

  try {
    const { name, color, icon } = parse.data;

    const { data: existing } = await supabase
      .from('categories')
      .select('name')
      .eq('id', idParse.data)
      .eq('user_id', req.user!.id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Category not found' });
    if (existing.name === 'Others') {
      return res.status(403).json({ error: 'The "Others" category cannot be edited' });
    }

    const { data, error } = await supabase
      .from('categories')
      .update({ name, color, icon })
      .eq('id', idParse.data)
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const idParse = z.string().uuid().safeParse(req.params.id);
  if (!idParse.success) return res.status(400).json({ error: 'Invalid category ID' });

  const modeParam = req.query.mode;
  const mode = z.enum(['with_transactions', 'reassign']).optional().safeParse(modeParam);
  if (!mode.success) return res.status(400).json({ error: 'Invalid mode parameter' });

  try {
    const userId = req.user!.id;
    const categoryId = idParse.data;

    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id, type, name')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .single();

    if (catError || !category) return res.status(404).json({ error: 'Category not found' });
    if (category.name === 'Others') {
      return res.status(403).json({ error: 'The "Others" category cannot be deleted' });
    }

    if (mode.data === 'with_transactions') {
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('category_id', categoryId)
        .eq('user_id', userId);

      if (txError) throw txError;
    } else {
      const { data: otherCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('type', category.type)
        .eq('name', 'Others')
        .single();

      if (otherCategory) {
        await supabase
          .from('transactions')
          .update({ category_id: otherCategory.id })
          .eq('category_id', categoryId)
          .eq('user_id', userId);
      }
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ message: 'Category deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
