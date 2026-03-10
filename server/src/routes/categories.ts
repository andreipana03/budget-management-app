import { Router } from 'express';
import { supabase } from '../services/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all categories
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type } = req.query;

    let query = supabase
      .from('categories')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('name');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, type, color, icon } = req.body;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: req.user!.id,
        name,
        type,
        color: color || '#3B82F6',
        icon: icon || 'circle',
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, color, icon } = req.body;

    const { data, error } = await supabase
      .from('categories')
      .update({ name, color, icon })
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);

    if (error) throw error;

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
