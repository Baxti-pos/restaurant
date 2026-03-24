import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { formatCurrency, todayStr } from '../../lib/formatters';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import { StatCard } from '../../components/ui/StatCard';
import { TrendingUp, Package, ShoppingCart } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';

interface Props {
  activeBranchId: string;
  activeBranchName: string;
}

const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f43f5e', '#fb923c', '#14b8a6'
];

const getMonthRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: todayStr()
  };
};

export function ProductAnalyticsPage({ activeBranchId, activeBranchName }: Props) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ totalProducts: number; totalQty: number; totalRevenue: number } | null>(null);
  const [data, setData] = useState<{
    productId: string | null; productName: string;
    totalQty: number; totalRevenue: number; avgPrice: number; ordersCount: number;
  }[]>([]);
  const [range, setRange] = useState(getMonthRange);
  const [sortBy, setSortBy] = useState<'totalRevenue' | 'totalQty'>('totalRevenue');

  const load = async () => {
    setLoading(true);
    try {
      const result = await api.reports.productPerformance(activeBranchId, range.from, range.to);
      setSummary(result.summary);
      setData(result.data);
    } catch {
      setSummary(null);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeBranchId, range.from, range.to]);

  const sorted = [...data].sort((a, b) => b[sortBy] - a[sortBy]).slice(0, 15);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Mahsulot Samaradorligi</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Faol filial: <span className="font-medium text-indigo-600">{activeBranchName}</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-44">
          <Input
            label="Dan"
            type="date"
            value={range.from}
            onChange={e => setRange(prev => ({ ...prev, from: e.target.value }))}
          />
        </div>
        <div className="w-full sm:w-44">
          <Input
            label="Gacha"
            type="date"
            value={range.to}
            onChange={e => setRange(prev => ({ ...prev, to: e.target.value }))}
          />
        </div>
        {(range.from || range.to) && (
          <div className="w-full sm:w-auto mb-1">
            <Button variant="ghost" className="text-slate-500" onClick={() => setRange({from: '', to: ''})}>
              Tozalash
            </Button>
          </div>
        )}
        <div className="w-full sm:w-56 ml-auto">
          <Select
            label="Saralash"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'totalRevenue' | 'totalQty')}
            options={[
              { value: 'totalRevenue', label: 'Tushum bo\'yicha' },
              { value: 'totalQty', label: 'Miqdor bo\'yicha' }
            ]}
          />
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <CardSkeleton count={3} />
      ) : summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Jami mahsulot turi"
            value={`${summary.totalProducts} ta`}
            icon={Package}
            color="indigo"
            subtitle="Sotilgan turlar soni"
          />
          <StatCard
            title="Jami sotilgan"
            value={`${summary.totalQty} dona`}
            icon={ShoppingCart}
            color="amber"
            subtitle="Umumiy miqdor"
          />
          <StatCard
            title="Jami tushum"
            value={formatCurrency(summary.totalRevenue)}
            icon={TrendingUp}
            color="green"
            subtitle="Barcha mahsulotlardan"
          />
        </div>
      )}

      {/* Charts Section */}
      {!loading && sorted.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart: top products */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">
                Top {sorted.length} mahsulot —{' '}
                {sortBy === 'totalRevenue' ? 'Tushum bo\'yicha' : 'Miqdor bo\'yicha'}
              </h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} style={{ outline: 'none' }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickFormatter={v =>
                      sortBy === 'totalRevenue'
                        ? `${(v / 1000).toFixed(0)}K`
                        : `${v}`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    tick={{ fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value: number) =>
                      sortBy === 'totalRevenue'
                        ? [formatCurrency(value), 'Tushum']
                        : [`${value} dona`, 'Miqdor']
                    }
                  />
                  <Bar dataKey={sortBy} radius={[0, 4, 4, 0]}>
                    {sorted.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: proportions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Top 5 ulushlar (<span className="capitalize">{sortBy === 'totalRevenue' ? 'tushum' : 'miqdor'}</span>)</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart style={{ outline: 'none' }}>
                  <Pie
                    data={sorted.slice(0, 5)}
                    dataKey={sortBy}
                    nameKey="productName"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    label={({ name, percent }) => `${name.substring(0, 10)} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                    style={{ outline: 'none' }}
                  >
                    {sorted.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      sortBy === 'totalRevenue'
                        ? [formatCurrency(value), 'Tushum']
                        : [`${value} dona`, 'Miqdor']
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && data.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Barchasi ({data.length} ta mahsulot)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Mahsulot</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Miqdor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Tushum</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">O'rtacha narx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...data]
                  .sort((a, b) => b[sortBy] - a[sortBy])
                  .map((row, i) => (
                    <tr key={row.productId ?? row.productName} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.productName}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{row.totalQty} dona</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">
                        {formatCurrency(row.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {formatCurrency(row.avgPrice)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && data.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Bu davrda sotuvlar topilmadi</p>
        </div>
      )}
    </div>
  );
}
