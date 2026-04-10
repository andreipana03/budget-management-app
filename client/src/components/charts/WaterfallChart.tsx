import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Rectangle } from 'recharts';
import { Transaction } from '../../types/index.ts';

interface WaterfallEntry { name: string; base: number; value: number; color: string; isTotal: boolean; }

function buildData(transactions: Transaction[]): WaterfallEntry[] {
  const now = new Date();
  const current = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const income = current.filter((t) => t.categories?.type === 'income').reduce((s, t) => s + parseFloat(t.converted_amount.toString()), 0);
  const catMap = new Map<string, { total: number; color: string }>();
  for (const t of current.filter((t) => t.categories?.type === 'expense')) {
    const name = t.categories!.name;
    const existing = catMap.get(name);
    const amount = parseFloat(t.converted_amount.toString());
    if (existing) existing.total += amount;
    else catMap.set(name, { total: amount, color: t.categories!.color });
  }
  const entries: WaterfallEntry[] = [];
  entries.push({ name: 'Income', base: 0, value: income, color: '#10B981', isTotal: true });
  let running = income;
  for (const [name, { total, color }] of catMap.entries()) {
    entries.push({ name, base: running - total, value: total, color, isTotal: false });
    running -= total;
  }
  entries.push({ name: 'Balance', base: 0, value: running, color: running >= 0 ? '#10B981' : '#F43F5E', isTotal: true });
  return entries;
}

const CustomBar = (props: any) => {
  const { x, y, width, height, color } = props;
  if (!height || height === 0) return null;
  return <Rectangle x={x} y={y} width={width} height={Math.abs(height)} fill={color} radius={[3, 3, 0, 0]} />;
};

export default function WaterfallChart({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
  const data = buildData(transactions);
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const entry: WaterfallEntry = payload[0]?.payload;
    if (!entry) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
        <p className="font-medium text-gray-900 dark:text-white">{entry.name}</p>
        <p style={{ color: entry.color }}>{entry.value.toFixed(2)} {currency}</p>
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : v} />
        <YAxis tick={{ fontSize: 11 }} width={75} tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v} ${currency}`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false}>
          {data.map((_, i) => <Cell key={i} fill="transparent" />)}
        </Bar>
        <Bar dataKey="value" stackId="wf" shape={<CustomBar />} isAnimationActive={false}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
