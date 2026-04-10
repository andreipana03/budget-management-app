import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, Plus, CalendarDays, ChevronDown } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api.ts';
import { Transaction } from '../types/index.ts';
import TransactionModal from '../components/transactions/TransactionModal.tsx';
import CategoryIcon from '../components/categories/CategoryIcon.tsx';
import MonthlyTrendChart from '../components/charts/MonthlyTrendChart.tsx';
import StackedCategoryChart from '../components/charts/StackedCategoryChart.tsx';
import WaterfallChart from '../components/charts/WaterfallChart.tsx';
import HeatmapCalendar from '../components/charts/HeatmapCalendar.tsx';
import { usePreferences } from '../context/PreferencesContext.tsx';

type ChartView = 'expense' | 'income';
type DatePreset = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom' | 'all';
type ActiveChart = 'category' | 'trend' | 'stacked' | 'waterfall' | 'heatmap';

interface CategorySlice { name: string; value: number; color: string; icon: string; }

function shiftLightness(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  l = Math.min(1, Math.max(0, l + amount));
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(hue2rgb(p, q, h + 1/3))}${toHex(hue2rgb(p, q, h))}${toHex(hue2rgb(p, q, h - 1/3))}`;
}

function buildChartData(transactions: Transaction[], type: ChartView, convert: (amount: number, from: string) => number): CategorySlice[] {
  const map = new Map<string, CategorySlice>();
  for (const t of transactions) {
    if (t.categories?.type !== type) continue;
    const key = t.categories.name;
    const existing = map.get(key);
    const amount = convert(parseFloat(t.amount.toString()), t.currency);
    if (existing) { existing.value += amount; }
    else { map.set(key, { name: key, value: amount, color: t.categories.color, icon: t.categories.icon || '' }); }
  }
  const slices = Array.from(map.values()).sort((a, b) => b.value - a.value);
  const usedColors = new Map<string, number>();
  for (const slice of slices) {
    const base = slice.color.toLowerCase();
    const count = usedColors.get(base) ?? 0;
    if (count > 0) { const step = Math.ceil(count / 2) * 0.12; slice.color = shiftLightness(slice.color, count % 2 === 1 ? step : -step); }
    usedColors.set(base, count + 1);
  }
  return slices;
}

const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, name, value, percent, icon }: any) => {
  if (percent < 0.03) return null;
  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-midAngle * RADIAN), cos = Math.cos(-midAngle * RADIAN);
  const x1 = cx + (outerRadius + 6) * cos, y1 = cy + (outerRadius + 6) * sin;
  const x2 = cx + (outerRadius + 22) * cos, y2 = cy + (outerRadius + 22) * sin;
  const x3 = x2 + (cos >= 0 ? 10 : -10);
  const anchor = cos >= 0 ? 'start' : 'end';
  const label = `${value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toFixed(0)} (${(percent * 100).toFixed(1)}%)`;
  return (
    <g>
      <polyline points={`${x1},${y1} ${x2},${y2} ${x3},${y2}`} fill="none" stroke="#94A3B8" strokeWidth={1} />
      <text x={x3 + (cos >= 0 ? 4 : -4)} y={y2} textAnchor={anchor} dominantBaseline="middle" fontSize={10} fill="#94A3B8">
        {icon ? `${icon} ` : ''}{name.length > 12 ? name.slice(0, 11) + '…' : name}
      </text>
      <text x={x3 + (cos >= 0 ? 4 : -4)} y={y2 + 12} textAnchor={anchor} dominantBaseline="middle" fontSize={9} fill="#64748B">{label}</text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, icon } = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-gray-900 dark:text-white">{icon ? `${icon} ` : ''}{name}</p>
      <p className="text-gray-500 dark:text-gray-400">{value.toFixed(2)} {currency}</p>
    </div>
  );
};

const CHART_TABS: { value: ActiveChart; label: string }[] = [
  { value: 'category',  label: 'By Category' },
  { value: 'trend',     label: 'Monthly Trend' },
  { value: 'stacked',   label: 'Category Trend' },
  { value: 'waterfall', label: 'Waterfall' },
  { value: 'heatmap',   label: 'Heatmap' },
];

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'this_month',    label: 'This month' },
  { value: 'last_month',    label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'this_year',     label: 'This year' },
  { value: 'all',           label: 'All time' },
  { value: 'custom',        label: 'Custom range' },
];

export default function Dashboard() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [activeChart, setActiveChart] = useState<ActiveChart>('category');
  const [chartView, setChartView] = useState<ChartView>('expense');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDateMenu, setShowDateMenu] = useState(false);

  const { currency, fmt, setCurrency, convert } = usePreferences();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/transactions');
      setAllTransactions(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recompute stats whenever transactions or currency changes
  const stats = useMemo(() => {
    let totalIncome = 0, totalExpenses = 0;
    for (const t of allTransactions) {
      const amount = convert(parseFloat(t.amount.toString()), t.currency);
      if (t.categories?.type === 'income') totalIncome += amount;
      else if (t.categories?.type === 'expense') totalExpenses += amount;
    }
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  }, [allTransactions, currency, convert]);

  function getDateRange(): { from: Date | null; to: Date | null } {
    const now = new Date();
    if (datePreset === 'this_month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    if (datePreset === 'last_month') return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0) };
    if (datePreset === 'last_3_months') return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: now };
    if (datePreset === 'this_year') return { from: new Date(now.getFullYear(), 0, 1), to: now };
    if (datePreset === 'custom') return { from: customFrom ? new Date(customFrom) : null, to: customTo ? new Date(customTo + 'T23:59:59') : null };
    return { from: null, to: null };
  }

  const { from: filterFrom, to: filterTo } = getDateRange();
  const filteredForChart = allTransactions.filter((t) => {
    const d = new Date(t.date);
    if (filterFrom && d < filterFrom) return false;
    if (filterTo && d > filterTo) return false;
    return true;
  });

  const presetLabel = PRESETS.find((p) => p.value === datePreset)?.label ?? 'Filter';
  const recentTransactions = allTransactions.slice(0, 5);
  const chartData = useMemo(() => buildChartData(filteredForChart, chartView, convert), [filteredForChart, chartView, currency, convert]);

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          {/* Quick currency switcher */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-sm">
            {['USD', 'EUR', 'RON'].map((c) => (
              <button
                key={c}
                onClick={async () => {
                  setCurrency(c);
                  try { await api.put('/preferences', { default_currency: c }); } catch {}
                }}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  currency === c
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Income</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{fmt(stats.totalIncome)}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expenses</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{fmt(stats.totalExpenses)}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance</p>
              <p className={`text-3xl font-bold mt-2 ${stats.balance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>{fmt(stats.balance)}</p>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-full">
              <Wallet className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts — single tabbed card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
        {/* Tab strip */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {CHART_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveChart(tab.value)}
              className={`flex-shrink-0 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeChart === tab.value
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* By Category */}
          {activeChart === 'category' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {chartView === 'expense' ? 'Spending' : 'Income'} by Category
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <button
                      onClick={() => setShowDateMenu((v) => !v)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      <span>{presetLabel}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showDateMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showDateMenu && (
                      <div className="absolute right-0 top-full mt-1.5 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl p-2 w-52">
                        {PRESETS.filter((p) => p.value !== 'custom').map((p) => (
                          <button key={p.value} onClick={() => { setDatePreset(p.value); setShowDateMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${datePreset === p.value ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            {p.label}
                          </button>
                        ))}
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1.5" />
                        <button onClick={() => setDatePreset('custom')}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${datePreset === 'custom' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
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
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <button onClick={() => setChartView('expense')}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${chartView === 'expense' ? 'bg-red-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                      Spending
                    </button>
                    <button onClick={() => setChartView('income')}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${chartView === 'income' ? 'bg-primary-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                      Income
                    </button>
                  </div>
                </div>
              </div>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">No {chartView} data yet</div>
              ) : (
                <>
                  <div className="relative" style={{ height: 380 }}>
                    <div className="relative z-10">
                      <ResponsiveContainer width="100%" height={380}>
                        <PieChart>
                          <Pie data={chartData} cx="50%" cy="50%" innerRadius={90} outerRadius={130} dataKey="value" paddingAngle={0.5} labelLine={false} label={renderCustomLabel}>
                            {chartData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="transparent" />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip currency={currency} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {(() => { const t = chartData.reduce((s, e) => s + e.value, 0); return t >= 1000 ? `${(t / 1000).toFixed(1)}K ${currency}` : `${t.toFixed(0)} ${currency}`; })()}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{chartView === 'expense' ? 'Total Spent' : 'Total Income'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {chartData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{entry.icon ? `${entry.icon} ` : ''}{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeChart === 'trend' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Monthly Income vs Expenses</h2>
              <MonthlyTrendChart transactions={allTransactions} currency={currency} />
            </>
          )}

          {activeChart === 'stacked' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Spending by Category (Last 6 Months)</h2>
              <StackedCategoryChart transactions={allTransactions} currency={currency} />
            </>
          )}

          {activeChart === 'waterfall' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">This Month Waterfall</h2>
              <WaterfallChart transactions={allTransactions} currency={currency} />
            </>
          )}

          {activeChart === 'heatmap' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Daily Spend Heatmap</h2>
              <HeatmapCalendar transactions={allTransactions} currency={currency} />
            </>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
        </div>
        <div className="p-6">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Start by adding your first transaction</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <CategoryIcon icon={transaction.categories?.icon} color={transaction.categories?.color || '#6B7280'} size="md" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{transaction.categories?.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(transaction.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${transaction.categories?.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.categories?.type === 'income' ? '+' : '-'}
                      {convert(parseFloat(transaction.amount.toString()), transaction.currency).toFixed(2)} {currency}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(transaction.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && <TransactionModal onClose={() => setShowModal(false)} onSaved={fetchData} />}
    </div>
  );
}
