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

    // Prevent editing the "Other" category
    const { data: existing } = await supabase
      .from('categories')
      .select('name')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single();

    if (existing?.name === 'Other') {
      return res.status(403).json({ error: 'The "Other" category cannot be edited' });
    }

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
// ?mode=with_transactions → delete category + all its transactions
// ?mode=reassign (default) → reassign transactions to user's "Other" category, then delete
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { mode } = req.query;
    const userId = req.user!.id;
    const categoryId = req.params.id;

    // Verify the category belongs to this user
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id, type, name')
      .eq('id', categoryId)
      .eq('user_id', userId)
      .single();

    if (catError || !category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent deleting the "Other" category
    if (category.name === 'Other') {
      return res.status(403).json({ error: 'The "Other" category cannot be deleted' });
    }

    if (mode === 'with_transactions') {
      // Delete all transactions using this category first
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('category_id', categoryId)
        .eq('user_id', userId);

      if (txError) throw txError;
    } else {
      // Reassign transactions to the user's "Other" category of the same type
      const { data: otherCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('type', category.type)
        .eq('name', 'Other')
        .single();

      if (otherCategory) {
        await supabase
          .from('transactions')
          .update({ category_id: otherCategory.id })
          .eq('category_id', categoryId)
          .eq('user_id', userId);
      }
    }

    // Delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
