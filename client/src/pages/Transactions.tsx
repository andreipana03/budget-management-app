import { useEffect, useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, CalendarDays, ChevronDown, X } from 'lucide-react';
import api from '../services/api.ts';
import { Transaction, Category } from '../types/index.ts';
import TransactionModal from '../components/transactions/TransactionModal.tsx';
import CategoryIcon from '../components/categories/CategoryIcon.tsx';
import { usePreferences } from '../context/PreferencesContext.tsx';

type TypeFilter = 'all' | 'expense' | 'income';
type DatePreset = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom';

function getDateRange(preset: DatePreset, customFrom: string, customTo: string) {
  const now = new Date();
  if (preset === 'this_month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  if (preset === 'last_month') return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) };
  if (preset === 'last_3_months') return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: now };
  if (preset === 'this_year') return { from: new Date(now.getFullYear(), 0, 1), to: now };
  if (preset === 'custom') return { from: customFrom ? new Date(customFrom) : null, to: customTo ? new Date(customTo + 'T23:59:59') : null };
  return { from: null, to: null };
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'this_year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  const { currency, convert } = usePreferences();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [txRes, catRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/categories'),
      ]);
      setTransactions(txRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/transactions/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setEditingTransaction(null);
  };

  // Filtered transactions
  const filtered = useMemo(() => {
    const { from, to } = getDateRange(datePreset, customFrom, customTo);
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.categories?.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;
      const d = new Date(t.date);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [transactions, typeFilter, categoryFilter, datePreset, customFrom, customTo]);

  // Categories available for the current type filter
  const availableCategories = useMemo(() =>
    categories.filter((c) => typeFilter === 'all' || c.type === typeFilter),
    [categories, typeFilter]
  );

  const activeDateLabel = DATE_PRESETS.find((p) => p.value === datePreset)?.label ?? 'Date';
  const activeCategoryLabel = categoryFilter === 'all'
    ? 'Category'
    : (categories.find((c) => c.id === categoryFilter)?.name ?? 'Category');

  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== 'all' || datePreset !== 'all';

  const clearFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setDatePreset('all');
    setCustomFrom('');
    setCustomTo('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Transaction
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Type toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-sm">
          {(['all', 'expense', 'income'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setCategoryFilter('all'); }}
              className={`px-4 py-1.5 font-medium transition-colors capitalize ${
                typeFilter === t
                  ? t === 'expense' ? 'bg-red-500 text-white'
                    : t === 'income' ? 'bg-green-500 text-white'
                    : 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t === 'all' ? 'All' : t === 'expense' ? 'Expenses' : 'Income'}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div className="relative">
          <button
            onClick={() => { setShowDateMenu((v) => !v); setShowCategoryMenu(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              datePreset !== 'all'
                ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>{activeDateLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDateMenu ? 'rotate-180' : ''}`} />
          </button>

          {showDateMenu && (
            <div className="absolute left-0 top-full mt-1.5 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl p-2 w-52">
              {DATE_PRESETS.filter((p) => p.value !== 'custom').map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setDatePreset(p.value); setShowDateMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    datePreset === p.value
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-700 my-1.5" />
              <button
                onClick={() => setDatePreset('custom')}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  datePreset === 'custom'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Custom range
              </button>
              {datePreset === 'custom' && (
                <div className="px-2 pt-2 space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 block">From</label>
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 block">To</label>
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <button onClick={() => setShowDateMenu(false)}
                    className="w-full py-1.5 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category filter */}
        <div className="relative">
          <button
            onClick={() => { setShowCategoryMenu((v) => !v); setShowDateMenu(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              categoryFilter !== 'all'
                ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {categoryFilter !== 'all' && (() => {
              const cat = categories.find((c) => c.id === categoryFilter);
              return cat ? <CategoryIcon icon={cat.icon} color={cat.color} size="sm" /> : null;
            })()}
            <span>{activeCategoryLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`} />
          </button>

          {showCategoryMenu && (
            <div className="absolute left-0 top-full mt-1.5 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl py-2 w-52 max-h-64 overflow-y-auto">
              <button
                onClick={() => { setCategoryFilter('all'); setShowCategoryMenu(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                All categories
              </button>
              <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
              {availableCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryFilter(cat.id); setShowCategoryMenu(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    categoryFilter === cat.id
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}

        <span className="ml-auto text-sm text-gray-400 dark:text-gray-500">
          {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}
        </span>
      </div>

      {/* Transactions table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {hasActiveFilters ? 'No transactions match your filters' : 'No transactions yet'}
            </p>
            {!hasActiveFilters && (
              <button onClick={() => setShowModal(true)} className="mt-4 text-primary-600 hover:text-primary-700 dark:text-primary-400">
                Add your first transaction
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CategoryIcon icon={transaction.categories?.icon} color={transaction.categories?.color || '#6B7280'} size="sm" />
                        <span className="text-sm text-gray-900 dark:text-white">{transaction.categories?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-semibold ${
                        transaction.categories?.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.categories?.type === 'income' ? '+' : '-'}
                        {convert(parseFloat(transaction.amount.toString()), transaction.currency).toFixed(2)} {currency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button onClick={() => handleEdit(transaction)} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 mr-3">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(transaction)} className="text-red-600 hover:text-red-900 dark:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TransactionModal transaction={editingTransaction} onClose={handleClose} onSaved={fetchData} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delete transaction</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {deleteTarget.description
                ? <><span className="font-medium text-gray-800 dark:text-gray-200">"{deleteTarget.description}"</span> will be</>
                : 'This transaction will be'} permanently deleted.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
