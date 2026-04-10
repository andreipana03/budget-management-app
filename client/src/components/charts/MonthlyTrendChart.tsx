import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Transaction } from '../../types/index.ts';

interface MonthlyPoint { month: string; income: number; expenses: number; balance: number; }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildData(transactions: Transaction[]): MonthlyPoint[] {
  const now = new Date();
  const months: MonthlyPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: MONTH_NAMES[d.getMonth()], income: 0, expenses: 0, balance: 0 });
  }
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  for (const t of transactions) {
    const d = new Date(t.date);
    if (d < startDate) continue;
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo < 0 || monthsAgo > 11) continue;
    const amount = parseFloat(t.converted_amount.toString());
    if (t.categories?.type === 'income') months[11 - monthsAgo].income += amount;
    else if (t.categories?.type === 'expense') months[11 - monthsAgo].expenses += amount;
  }
  for (const m of months) m.balance = m.income - m.expenses;
  return months;
}

export default function MonthlyTrendChart({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
  const data = buildData(transactions);
  const tickFmt = (v: number) => `${v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v} ${currency}`;
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const get = (name: string) => payload.find((p: any) => p.dataKey === name)?.value ?? 0;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
        <p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>
        <p className="text-green-600 dark:text-green-400">Income: {get('income').toFixed(2)} {currency}</p>
        <p className="text-rose-500 dark:text-rose-400">Expenses: {get('expenses').toFixed(2)} {currency}</p>
        <p className="text-indigo-500 dark:text-indigo-400">Balance: {get('balance').toFixed(2)} {currency}</p>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={tickFmt} tick={{ fontSize: 11 }} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="expenses" name="Expenses" fill="#F43F5E" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
        <Bar dataKey="income" name="Income" fill="#10B981" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
        <Line dataKey="balance" name="Balance" stroke="#6366F1" strokeWidth={2} dot={false} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
