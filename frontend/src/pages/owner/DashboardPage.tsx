import React, { useEffect, useState } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  CardSkeleton,
  TableSkeleton } from
'../../components/ui/LoadingSkeleton';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Eye,
  CheckCircle } from
'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend } from
'recharts';
import { api } from '../../lib/api';
import { DashboardStats, Order } from '../../lib/types';
import { formatCurrency, formatTime } from '../../lib/formatters';
interface DashboardPageProps {
  activeBranchId: string;
  activeBranchName: string;
  onNavigate: (page: string) => void;
}
const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b'];
export function DashboardPage({
  activeBranchId,
  activeBranchName,
  onNavigate
}: DashboardPageProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api.dashboard.getStats(activeBranchId).then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, [activeBranchId]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Bosh sahifa</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Faol filial:{' '}
          <span className="font-medium text-indigo-600">
            {activeBranchName}
          </span>
        </p>
      </div>

      {/* Stat cards */}
      {loading ?
      <CardSkeleton count={4} /> :

      stats &&
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
          title="Bugungi tushum"
          value={formatCurrency(stats.todayRevenue)}
          icon={TrendingUp}
          color="green"
          subtitle="Bugun yopilgan buyurtmalar" />

            <StatCard
          title="Bugungi xarajat"
          value={formatCurrency(stats.todayExpenses)}
          icon={TrendingDown}
          color="red"
          subtitle="Bugungi xarajatlar" />

            <StatCard
          title="Bugungi foyda"
          value={formatCurrency(stats.todayProfit)}
          icon={DollarSign}
          color="indigo"
          subtitle="Tushum − Xarajat" />

            <StatCard
          title="Ochiq buyurtmalar"
          value={`${stats.openOrdersCount} ta`}
          icon={ShoppingCart}
          color="amber"
          subtitle="Hozirgi vaqtda" />

          </div>

      }

      {/* Charts */}
      {!loading && stats &&
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Line chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Haftalik tushum va xarajat
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 11
                  }} />

                  <YAxis
                  tick={{
                    fontSize: 11
                  }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />

                  <Tooltip
                  formatter={(value: number) => formatCurrency(value)} />

                  <Legend />
                  <Line
                  type="monotone"
                  dataKey="tushum"
                  name="Tushum"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false} />

                  <Line
                  type="monotone"
                  dataKey="xarajat"
                  name="Xarajat"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false} />

                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Xarajat turlari
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                  data={stats.expensesByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value">

                    {stats.expensesByType.map((_, i) =>
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  )}
                  </Pie>
                  <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    borderRadius: 10,
                    fontSize: 12
                  }} />

                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {stats.expensesByType.map((e, i) =>
            <div
              key={e.name}
              className="flex items-center justify-between text-xs">

                  <div className="flex items-center space-x-2">
                    <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: PIE_COLORS[i]
                  }} />

                    <span className="text-slate-600">{e.name}</span>
                  </div>
                  <span className="font-medium text-slate-800">
                    {formatCurrency(e.value)}
                  </span>
                </div>
            )}
            </div>
          </div>
        </div>
      }

      {/* Bar chart */}
      {!loading && stats &&
      <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Kunlik buyurtmalar
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ordersChart}>
                <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9" />

                <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: '#94a3b8',
                  fontSize: 12
                }} />

                <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: '#94a3b8',
                  fontSize: 11
                }} />

                <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  fontSize: 12
                }} />

                <Bar
                dataKey="soni"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                name="Buyurtmalar" />

              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      }

      {/* Open orders table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Ochiq buyurtmalar
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('orders')}>

            Barchasini ko'rish →
          </Button>
        </div>
        {loading ?
        <div className="p-5">
            <TableSkeleton rows={3} />
          </div> :
        stats && stats.openOrders.length === 0 ?
        <div className="py-12 text-center">
            <ShoppingCart className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Hozircha ochiq buyurtmalar yo'q
            </p>
          </div> :

        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Stol
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ofitsant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Vaqt
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Summa
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Holat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.openOrders.map((order) =>
              <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {order.tableName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {order.waiterName}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="warning" size="sm">
                        Ochiq
                      </Badge>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>);

}