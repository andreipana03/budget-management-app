import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction } from '../../types/index.ts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getIntensityClass(amount: number, max: number, type: 'expense' | 'income'): string {
  if (amount === 0) return 'bg-gray-100 dark:bg-gray-700';
  const ratio = amount / max;
  if (type === 'expense') {
    if (ratio > 0.75) return 'bg-red-700 dark:bg-red-500';
    if (ratio > 0.4)  return 'bg-red-500 dark:bg-red-600';
    if (ratio > 0.15) return 'bg-red-300 dark:bg-red-700';
    return 'bg-red-100 dark:bg-red-900';
  } else {
    if (ratio > 0.75) return 'bg-green-700 dark:bg-green-500';
    if (ratio > 0.4)  return 'bg-green-500 dark:bg-green-600';
    if (ratio > 0.15) return 'bg-green-300 dark:bg-green-700';
    return 'bg-green-100 dark:bg-green-900';
  }
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HeatmapCalendar({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  // Derive available years from transaction data (plus current year always included)
  const txYears = Array.from(new Set(transactions.map((t) => new Date(t.date).getFullYear())));
  const minYear = txYears.length > 0 ? Math.min(...txYears) : currentYear;

  // Build daily spend maps for both types
  const expenseMap = new Map<string, number>();
  const incomeMap  = new Map<string, number>();
  for (const t of transactions) {
    const key = t.date.slice(0, 10);
    const amount = parseFloat(t.converted_amount.toString());
    if (t.categories?.type === 'expense') expenseMap.set(key, (expenseMap.get(key) ?? 0) + amount);
    else if (t.categories?.type === 'income') incomeMap.set(key, (incomeMap.get(key) ?? 0) + amount);
  }

  const maxExpense = Math.max(...Array.from(expenseMap.values()), 1);
  const maxIncome  = Math.max(...Array.from(incomeMap.values()), 1);

  // Jan 1 → Dec 31 of selected year
  const startDate = new Date(year, 0, 1);
  const endDate   = new Date(year, 11, 31);

  // Pad back to nearest Monday
  const padDays = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
  const gridStart = new Date(startDate);
  gridStart.setDate(gridStart.getDate() - padDays);

  // Build weeks
  const weeks: (Date | null)[][] = [];
  const cur = new Date(gridStart);
  while (cur <= endDate) {
    const week: (Date | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(cur);
      week.push(day.getFullYear() === year ? day : null);
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  // Month labels
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const firstDay = week.find((d) => d !== null) ?? null;
    if (firstDay && firstDay.getMonth() !== lastMonth) {
      monthLabels.push({ col, label: MONTH_NAMES[firstDay.getMonth()] });
      lastMonth = firstDay.getMonth();
    }
  });

  return (
    <div>
      {/* Year selector */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setYear((y) => y - 1)}
          disabled={year <= minYear}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-center">{year}</span>
        <button
          onClick={() => setYear((y) => y + 1)}
          disabled={year >= currentYear}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels */}
          <div className="flex gap-1 pl-6">
            {weeks.map((_, col) => {
              const label = monthLabels.find((m) => m.col === col);
              return (
                <div key={col} className="w-3 text-xs text-gray-400 dark:text-gray-500 leading-none">
                  {label ? label.label : ''}
                </div>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* Day-of-week labels */}
            <div className="flex flex-col gap-1 pr-1">
              {['M', '', 'W', '', 'F', '', ''].map((label, i) => (
                <div key={i} className="w-4 h-3 text-xs text-gray-400 dark:text-gray-500 leading-none flex items-center">
                  {label}
                </div>
              ))}
            </div>

            {/* Columns */}
            {weeks.map((week, col) => (
              <div key={col} className="flex flex-col gap-1">
                {week.map((day, row) => {
                  if (!day) return <div key={row} className="w-3 h-3" />;
                  const key = toDateKey(day);
                  const exp = expenseMap.get(key) ?? 0;
                  const inc = incomeMap.get(key) ?? 0;
                  // dominant type determines color; if equal and both >0, expense wins
                  const dominant: 'expense' | 'income' | null =
                    exp === 0 && inc === 0 ? null : inc > exp ? 'income' : 'expense';
                  const amount = dominant === 'income' ? inc : exp;
                  const max    = dominant === 'income' ? maxIncome : maxExpense;
                  const cls = dominant ? getIntensityClass(amount, max, dominant) : 'bg-gray-100 dark:bg-gray-700';
                  const parts = [];
                  if (exp > 0) parts.push(`-${exp.toFixed(2)} ${currency}`);
                  if (inc > 0) parts.push(`+${inc.toFixed(2)} ${currency}`);
                  const tooltip = `${day.toLocaleDateString()} — ${parts.length ? parts.join('  ') : 'No activity'}`;
                  return (
                    <div key={row} title={tooltip} className={`w-3 h-3 rounded-sm cursor-default ${cls}`} />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700 inline-block" />
          None
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-200 dark:bg-red-800 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-red-400 dark:bg-red-600 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-red-600 dark:bg-red-500 inline-block" />
          Expenses
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-800 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600 inline-block" />
          <span className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500 inline-block" />
          Income
        </div>
      </div>
    </div>
  );
}
