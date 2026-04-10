import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, Hash, ChevronDown } from 'lucide-react';
import api from '../services/api.ts';
import { Category } from '../types/index.ts';
import CategoryIcon from '../components/categories/CategoryIcon.tsx';
import IconPicker from '../components/categories/IconPicker.tsx';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'expense' | 'income',
    color: '#10B981',
    icon: '',
  });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/categories', formData);
      }
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', type: 'expense', color: '#10B981', icon: '' });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDelete = async (id: string, mode: 'with_transactions' | 'reassign') => {
    try {
      await api.delete(`/categories/${id}?mode=${mode}`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, type: category.type, color: category.color, icon: category.icon || '' });
    setShowModal(true);
  };

  const filteredCategories = categories
    .filter((cat) => cat.type === activeTab)
    .sort((a, b) => {
      if (a.name === 'Other') return 1;
      if (b.name === 'Other') return -1;
      return a.name.localeCompare(b.name);
    });

  const presetColors = [
    // Reds & Pinks
    '#F43F5E', '#FB7185', '#E11D48',
    // Oranges
    '#F97316', '#FB923C', '#EA580C',
    // Yellows & Ambers
    '#F59E0B', '#FBBF24', '#D97706',
    // Greens
    '#10B981', '#34D399', '#059669',
    '#22C55E', '#4ADE80', '#16A34A',
    // Teals & Cyans
    '#14B8A6', '#2DD4BF', '#0D9488',
    '#06B6D4', '#22D3EE', '#0891B2',
    // Blues
    '#3B82F6', '#60A5FA', '#2563EB',
    '#6366F1', '#818CF8', '#4F46E5',
    // Purples & Violets
    '#8B5CF6', '#A78BFA', '#7C3AED',
    '#A855F7', '#C084FC', '#9333EA',
    // Pinks & Roses
    '#EC4899', '#F472B6', '#DB2777',
    // Neutrals
    '#94A3B8', '#64748B', '#475569',
    '#6B7280', '#9CA3AF', '#374151',
  ];

  const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{6}$/.test(hex);
  const [customHex, setCustomHex] = useState('');
  const [hexError, setHexError] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorTriggerRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node) &&
        colorTriggerRef.current && !colorTriggerRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Categories</h1>
        <button
          onClick={() => { setFormData({ ...formData, type: activeTab }); setCustomHex(''); setHexError(false); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('expense')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'expense' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${activeTab === 'income' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
        >
          Income
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CategoryIcon icon={category.icon} color={category.color} size="lg" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{category.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{category.is_default ? 'Default' : 'Custom'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {category.name !== 'Other' && (
                <>
                  <button onClick={() => handleEdit(category)} className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(category)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No {activeTab} categories yet</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'expense' | 'income' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icon</label>
                <IconPicker value={formData.icon} onChange={(icon) => setFormData({ ...formData, icon })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                <div className="relative">
                  {/* Trigger button */}
                  <button
                    ref={colorTriggerRef}
                    type="button"
                    onClick={() => setShowColorPicker((v) => !v)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className="w-5 h-5 rounded-md flex-shrink-0 border border-black/10" style={{ backgroundColor: formData.color }} />
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-200 flex-1 text-left">{formData.color}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showColorPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Popover — opens upward so it's never clipped by the modal bottom */}
                  {showColorPicker && (
                    <div
                      ref={colorPickerRef}
                      className="absolute left-0 bottom-full mb-1.5 z-[60] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl p-3 w-64"
                    >
                      {/* Preset palette + custom color swatch at the end */}
                      <div className="grid grid-cols-6 gap-1.5 mb-3">
                        {presetColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => { setFormData({ ...formData, color }); setCustomHex(''); setHexError(false); }}
                            className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${formData.color === color && presetColors.includes(formData.color) ? 'ring-2 ring-offset-2 ring-primary-600 scale-110' : ''}`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                        {/* Custom color — rainbow swatch that opens the native picker */}
                        <button
                          type="button"
                          onClick={() => colorInputRef.current?.click()}
                          className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 overflow-hidden relative ${!presetColors.includes(formData.color) ? 'ring-2 ring-offset-2 ring-primary-600 scale-110' : ''}`}
                          title="Custom color"
                          style={{
                            background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                          }}
                        >
                          <input
                            ref={colorInputRef}
                            type="color"
                            value={formData.color}
                            onChange={(e) => { setFormData({ ...formData, color: e.target.value }); setCustomHex(e.target.value.replace('#', '')); setHexError(false); }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-gray-100 dark:border-gray-700 mb-3" />

                      {/* Hex input */}
                      <div className="flex items-center gap-2">
                        <span
                          className="w-8 h-8 rounded-lg flex-shrink-0 border border-gray-200 dark:border-gray-600"
                          style={{ backgroundColor: formData.color }}
                        />
                        <div className="relative flex-1">
                          <Hash className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            placeholder="A3E635"
                            value={customHex}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/^#/, '');
                              setCustomHex(raw);
                              const full = '#' + raw;
                              if (isValidHex(full)) { setFormData({ ...formData, color: full }); setHexError(false); }
                              else { setHexError(raw.length > 0); }
                            }}
                            maxLength={6}
                            className={`w-full pl-7 pr-2 py-1.5 text-sm border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono ${hexError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                          />
                        </div>
                      </div>
                      {hexError && <p className="text-xs text-red-500 mt-1.5">Enter a valid 6-digit hex code</p>}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingCategory(null); setFormData({ name: '', type: 'expense', color: '#10B981', icon: '' }); setCustomHex(''); setHexError(false); setShowColorPicker(false); }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                  {editingCategory ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delete "{deleteTarget.name}"</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This category may be used by existing transactions. How would you like to proceed?
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleDelete(deleteTarget.id, 'with_transactions')} className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium text-left">
                <span className="font-semibold">Delete category and all its transactions</span>
                <p className="text-red-200 text-xs mt-0.5">All transactions in this category will be permanently removed</p>
              </button>
              <button onClick={() => handleDelete(deleteTarget.id, 'reassign')} className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium text-left">
                <span className="font-semibold">Delete category only</span>
                <p className="text-yellow-100 text-xs mt-0.5">Transactions will be moved to the "Other" category</p>
              </button>
              <button onClick={() => setDeleteTarget(null)} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
