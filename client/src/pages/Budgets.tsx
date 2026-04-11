import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Sparkles, Info, Target } from 'lucide-react';
import api from '../services/api.ts';
import { Budget, Category } from '../types/index.ts';
import CategoryIcon from '../components/categories/CategoryIcon.tsx';
import { usePreferences } from '../context/PreferencesContext.tsx';

// Keywords used to classify categories into Needs vs Wants
const NEEDS_KEYWORDS = [
  'housing', 'rent', 'mortgage', 'utilities', 'bills', 'electricity', 'water',
  'internet', 'phone', 'mobile', 'insurance', 'health', 'healthcare', 'medical',
  'medicine', 'grocery', 'groceries', 'supermarket', 'transport', 'transportation',
  'commute', 'fuel', 'gas', 'car', 'personal care', 'hygiene', 'childcare',
];

function classifyCategory(name: string): 'needs' | 'wants' {
  const lower = name.toLowerCase();
  return NEEDS_KEYWORDS.some((kw) => lower.includes(kw)) ? 'needs' : 'wants';
}

export default function Budgets() {
  const { currency, convert, savedCurrency, savingsGoal, setSavingsGoal } = usePreferences();
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());

  // Auto budgeting state
  const [showAutoBudget, setShowAutoBudget] = useState(false);
  const [autoBuckets, setAutoBuckets] = useState({ needs: 50, wants: 30, savings: 20 });
  const [autoApplying, setAutoApplying] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    month: currentMonth,
    year: currentYear,
    limit_amount: '',
    currency: 'USD',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [budgetsRes, categoriesRes, transactionsRes] = await Promise.all([
        api.get(`/budgets/status/${currentYear}/${currentMonth}`),
        api.get('/categories?type=expense'),
        api.get('/transactions'),
      ]);
      setBudgets(budgetsRes.data);
      setCategories(categoriesRes.data);

      // Calculate total income, expenses and investments for current month
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const endOfMonth = new Date(currentYear, currentMonth, 0);
      const monthlyTransactions = transactionsRes.data.filter((t: any) => {
        const date = new Date(t.date);
        return date >= startOfMonth && date <= endOfMonth;
      });

      const monthlyIncome = monthlyTransactions
        .filter((t: any) => t.categories?.type === 'income')
        .reduce((sum: number, t: any) => sum + parseFloat(t.converted_amount || 0), 0);

      const monthlyExpenses = monthlyTransactions
        .filter((t: any) => t.categories?.type === 'expense')
        .reduce((sum: number, t: any) => sum + parseFloat(t.converted_amount || 0), 0);

      setTotalIncome(monthlyIncome);
      setTotalExpenses(monthlyExpenses);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}`, { limit_amount: formData.limit_amount, currency: formData.currency });
      } else {
        await api.post('/budgets', formData);
      }
      setShowModal(false);
      setEditingBudget(null);
      setFormData({
        category_id: '',
        month: currentMonth,
        year: currentYear,
        limit_amount: '',
        currency: currency,
      });
      fetchData();
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      category_id: budget.category_id,
      month: budget.month,
      year: budget.year,
      limit_amount: budget.limit_amount.toString(),
      currency: currency,
    });
    setShowModal(true);
  };

  const handleAutoBudget = async () => {
    if (totalIncome <= 0) return;
    setAutoApplying(true);
    try {
      const incomeInCurrency = convert(totalIncome, savedCurrency);
      const needsPool = incomeInCurrency * (autoBuckets.needs / 100);
      const wantsPool = incomeInCurrency * (autoBuckets.wants / 100);

      const needsCats = categories.filter((c) => classifyCategory(c.name) === 'needs');
      const wantsCats = categories.filter((c) => classifyCategory(c.name) === 'wants');

      const assignments: { category_id: string; limit_amount: number }[] = [
        ...needsCats.map((c) => ({
          category_id: c.id,
          limit_amount: parseFloat((needsPool / (needsCats.length || 1)).toFixed(2)),
        })),
        ...wantsCats.map((c) => ({
          category_id: c.id,
          limit_amount: parseFloat((wantsPool / (wantsCats.length || 1)).toFixed(2)),
        })),
      ];

      // Upsert: update existing budgets or create new ones
      await Promise.all(
        assignments.map(async ({ category_id, limit_amount }) => {
          const existing = budgets.find((b) => b.category_id === category_id);
          if (existing) {
            await api.put(`/budgets/${existing.id}`, { limit_amount, currency });
          } else {
            await api.post('/budgets', {
              category_id,
              month: currentMonth,
              year: currentYear,
              limit_amount,
              currency,
            });
          }
        })
      );

      setShowAutoBudget(false);
      fetchData();
    } catch (error) {
      console.error('Auto budgeting error:', error);
    } finally {
      setAutoApplying(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const totalBudgeted = budgets.reduce((sum, b) => sum + convert(parseFloat(b.limit_amount.toString()), savedCurrency), 0);
  const budgetedPercent = totalIncome > 0 ? Math.min((totalBudgeted / convert(totalIncome, savedCurrency)) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAutoBudget(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Custom Budgeting
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Set Budget
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Monthly Income</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {convert(totalIncome, savedCurrency).toFixed(2)} {currency}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Budgeted</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalBudgeted.toFixed(2)} {currency}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Savings</p>
            <button
              onClick={() => { setGoalInput(savingsGoal?.toString() ?? ''); setEditingGoal(true); }}
              className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded"
              title="Set savings goal"
            >
              <Target className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className={`text-2xl font-bold ${convert(totalIncome - totalExpenses, savedCurrency) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
            {convert(totalIncome - totalExpenses, savedCurrency).toFixed(2)} {currency}
          </p>
          {savingsGoal ? (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                <span>Goal: {convert(savingsGoal, savedCurrency).toFixed(0)} {currency}</span>
                <span>{Math.min(((totalIncome - totalExpenses) / savingsGoal) * 100, 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(Math.max(((totalIncome - totalExpenses) / savingsGoal) * 100, 0), 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">income − expenses</p>
          )}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Budget Coverage</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-violet-500 transition-all"
                style={{ width: `${budgetedPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
              {budgetedPercent.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Budgets List */}
      <div className="space-y-4">
        {budgets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No budgets set for this month</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              Set your first budget
            </button>
          </div>
        ) : (
          budgets.map((budget) => {
            const percentage = budget.percentage || 0;
            const spent = convert(budget.spent || 0, savedCurrency);
            const remaining = convert(budget.remaining || 0, savedCurrency);
            const limit = convert(parseFloat(budget.limit_amount.toString()), savedCurrency);

            return (
              <div
                key={budget.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      icon={budget.categories?.icon}
                      color={budget.categories?.color || '#6B7280'}
                      size="md"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {budget.categories?.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {spent.toFixed(2)} {currency} of {limit.toFixed(2)} {currency}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressColor(percentage)}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span
                    className={`font-medium ${
                      percentage >= 100
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {percentage.toFixed(1)}% used
                  </span>
                  <span
                    className={`font-medium ${
                      remaining < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {Math.abs(remaining).toFixed(2)} {currency} {remaining < 0 ? 'over' : 'left'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingBudget ? 'Edit Budget' : 'Set Budget'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  required
                  disabled={!!editingBudget}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Budget Limit
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.limit_amount}
                    onChange={(e) => setFormData({ ...formData, limit_amount: e.target.value })}
                    required
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="RON">RON</option>
                  </select>
                </div>
                {formData.currency !== currency && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Will be converted to {currency} using current exchange rates
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBudget(null);
                    setFormData({
                      category_id: '',
                      month: currentMonth,
                      year: currentYear,
                      limit_amount: '',
                      currency: currency,
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {editingBudget ? 'Update' : 'Set Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Savings Goal Modal */}
      {editingGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Savings Goal</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Set a monthly savings target. We'll track your progress against income minus expenses.
            </p>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 500"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              {savingsGoal && (
                <button
                  onClick={async () => { await setSavingsGoal(null); setEditingGoal(false); }}
                  className="px-4 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => setEditingGoal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const val = parseFloat(goalInput);
                  if (!isNaN(val) && val > 0) { await setSavingsGoal(val); setEditingGoal(false); }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Budgeting Modal */}
      {showAutoBudget && (() => {
        const incomeInCurrency = convert(totalIncome, savedCurrency);
        const needsPool = incomeInCurrency * (autoBuckets.needs / 100);
        const wantsPool = incomeInCurrency * (autoBuckets.wants / 100);
        const savingsPool = incomeInCurrency * (autoBuckets.savings / 100);
        const needsCats = categories.filter((c) => classifyCategory(c.name) === 'needs');
        const wantsCats = categories.filter((c) => classifyCategory(c.name) === 'wants');
        const total = autoBuckets.needs + autoBuckets.wants + autoBuckets.savings;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg shadow-2xl">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-1">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Custom Budgeting</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Based on the 50/30/20 rule. Adjust the split then apply.
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Income display */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Monthly Income</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {incomeInCurrency.toFixed(2)} {currency}
                  </span>
                </div>

                {/* Bucket sliders */}
                {[
                  { key: 'needs' as const, label: 'Needs', color: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500', pool: needsPool, desc: 'Housing, utilities, transport, healthcare, groceries' },
                  { key: 'wants' as const, label: 'Wants', color: 'text-violet-600 dark:text-violet-400', bar: 'bg-violet-500', pool: wantsPool, desc: 'Entertainment, dining, shopping, hobbies' },
                  { key: 'savings' as const, label: 'Savings', color: 'text-green-600 dark:text-green-400', bar: 'bg-green-500', pool: savingsPool, desc: 'Keep unbudgeted — save or invest this amount' },
                ].map(({ key, label, color, bar, pool, desc }) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className={`font-medium text-sm ${color}`}>{label}</span>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {pool.toFixed(0)} {currency}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={autoBuckets[key]}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              setAutoBuckets((prev) => ({ ...prev, [key]: val }));
                            }}
                            className="w-14 text-center px-1 py-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${autoBuckets[key]}%` }} />
                    </div>
                  </div>
                ))}

                {/* Total warning */}
                {total !== 100 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                    <Info className="w-4 h-4 flex-shrink-0" />
                    Total is {total}% — adjust to reach exactly 100%
                  </div>
                )}

                {/* Preview breakdown */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Preview</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {[...needsCats.map((c) => ({ c, pool: needsPool, count: needsCats.length, bucket: 'Needs' })),
                      ...wantsCats.map((c) => ({ c, pool: wantsPool, count: wantsCats.length, bucket: 'Wants' }))
                    ].map(({ c, pool, count, bucket }) => (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                          <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                          <span className="text-xs text-gray-400">({bucket})</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(pool / count).toFixed(2)} {currency}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => { setShowAutoBudget(false); setAutoBuckets({ needs: 50, wants: 30, savings: 20 }); }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAutoBudget}
                  disabled={total !== 100 || autoApplying || totalIncome <= 0}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {autoApplying ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  {autoApplying ? 'Applying...' : 'Apply Budgets'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
