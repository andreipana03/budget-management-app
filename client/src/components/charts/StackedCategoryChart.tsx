import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Transaction } from '../../types/index.ts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildData(transactions: Transaction[]) {
  const now = new Date();
  const monthKeys: string[] = [];
  const monthLabels: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    monthLabels.push(`${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`);
  }
  const expenses = transactions.filter((t) => t.categories?.type === 'expense');
  const catTotals = new Map<string, number>();
  const catColors = new Map<string, string>();
  for (const t of expenses) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthKeys.includes(key)) continue;
    const name = t.categories!.name;
    catTotals.set(name, (catTotals.get(name) ?? 0) + parseFloat(t.converted_amount.toString()));
    catColors.set(name, t.categories!.color);
  }
  const top6 = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
  const rows = monthKeys.map((_key, i) => {
    const row: Record<string, any> = { month: monthLabels[i] };
    for (const cat of top6) row[cat] = 0;
    return row;
  });
  for (const t of expenses) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const idx = monthKeys.indexOf(key);
    if (idx === -1) continue;
    const name = t.categories!.name;
    if (!top6.includes(name)) continue;
    rows[idx][name] += parseFloat(t.converted_amount.toString());
  }
  return { rows, top6, catColors };
}

export default function StackedCategoryChart({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
  const { rows, top6, catColors } = buildData(transactions);
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
        <p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill }}>{p.dataKey}: {(p.value as number).toFixed(2)} {currency}</p>
        ))}
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} width={70}
          tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v} ${currency}`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => <span style={{ color: catColors.get(value) }}>{value}</span>} />
        {top6.map((cat) => (
          <Bar key={cat} dataKey={cat} stackId="a" fill={catColors.get(cat) ?? '#6B7280'}
            radius={top6.indexOf(cat) === top6.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
