import React, { useEffect, useMemo, useState, Fragment } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatCard } from '../../components/ui/StatCard';
import {
  TableSkeleton,
  CardSkeleton } from
'../../components/ui/LoadingSkeleton';
import {
  ShoppingBag,
  TrendingUp,
  CheckCircle,
  Receipt,
  ChevronDown,
  PackageOpen,
  TrendingDown,
  DollarSign,
  Users } from
'lucide-react';
import { api } from '../../lib/api';
import { Order, WaiterActivity } from '../../lib/types';
import {
  formatCurrency,
  formatDateShort,
  formatDateTime,
  toLocalDateKey,
  todayStr } from
'../../lib/formatters';
import { clsx } from 'clsx';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend } from
'recharts';
interface OrdersPageProps {
  activeBranchId: string;
  activeBranchName: string;
}
type Tab = 'orders' | 'daily' | 'monthly' | 'waiters';
type RangeMode = 'today' | 'yesterday' | 'custom';
// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDateKey(order: Order): string {
  const src = order.closedAt || order.createdAt;
  return toLocalDateKey(src);
}
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateKey(d);
}
// ─── Main Page ────────────────────────────────────────────────────────────────
export function OrdersPage({
  activeBranchId,
  activeBranchName
}: OrdersPageProps) {
  const [tab, setTab] = useState<Tab>('orders');
  const tabs: {
    id: Tab;
    label: string;
  }[] = [
  {
    id: 'orders',
    label: 'Sotuvlar'
  },
  {
    id: 'daily',
    label: 'Kunlik hisobot'
  },
  {
    id: 'monthly',
    label: 'Oylik hisobot'
  },
  {
    id: 'waiters',
    label: 'Ofitsant faoliyati'
  }];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900">
          Sotuvlar
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
          Faol filial:{' '}
          <span className="font-medium text-indigo-600">
            {activeBranchName}
          </span>
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) =>
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              tab === t.id ?
              'border-indigo-600 text-indigo-600' :
              'border-transparent text-slate-500 hover:text-slate-700'
            )}>

              {t.label}
            </button>
          )}
        </div>
      </div>

      {tab === 'orders' && <SalesTab activeBranchId={activeBranchId} />}
      {tab === 'daily' && <DailyTab activeBranchId={activeBranchId} />}
      {tab === 'monthly' && <MonthlyTab activeBranchId={activeBranchId} />}
      {tab === 'waiters' && <WaitersTab activeBranchId={activeBranchId} />}
    </div>);

}
// ─── Tab 1: Sales Summary ─────────────────────────────────────────────────────
interface DayGroup {
  dateKey: string;
  orders: Order[];
  totalQty: number;
  totalRevenue: number;
}
function SalesTab({ activeBranchId }: {activeBranchId: string;}) {
  const [rangeMode, setRangeMode] = useState<RangeMode>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const fetchData = () => {
    setLoading(true);
    setPage(1);
    setExpandedDates(new Set());
    let from = '';
    let to = '';
    if (rangeMode === 'today') {
      from = todayStr();
      to = todayStr();
    } else if (rangeMode === 'yesterday') {
      from = yesterdayStr();
      to = yesterdayStr();
    } else {
      from = customFrom;
      to = customTo;
    }
    api.orders.
    listByBranch(activeBranchId, {
      status: 'closed',
      from,
      to
    }).
    then((data) => {
      setOrders(data);
    }).
    catch(() => {
      setOrders([]);
    }).
    finally(() => {
      setLoading(false);
    });
  };
  useEffect(() => {
    fetchData();
    const interval = window.setInterval(fetchData, 10000);
    return () => window.clearInterval(interval);
  }, [activeBranchId, rangeMode, customFrom, customTo]);
  // Group closed orders by day
  const dayGroups = useMemo<DayGroup[]>(() => {
    const closed = orders.filter((o) => o.status === 'closed');
    const map = new Map<string, Order[]>();
    for (const o of closed) {
      const key = getDateKey(o);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    const groups: DayGroup[] = [];
    for (const [dateKey, dayOrders] of map.entries()) {
      const totalQty = dayOrders.reduce(
        (s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0),
        0
      );
      const totalRevenue = dayOrders.reduce((s, o) => s + o.total, 0);
      groups.push({
        dateKey,
        orders: dayOrders,
        totalQty,
        totalRevenue
      });
    }
    return groups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [orders]);
  // Summary totals
  const totalQty = dayGroups.reduce((s, g) => s + g.totalQty, 0);
  const totalRevenue = dayGroups.reduce((s, g) => s + g.totalRevenue, 0);
  const totalClosedOrders = orders.filter((o) => o.status === 'closed').length;
  const avgCheck =
  totalClosedOrders > 0 ? Math.round(totalRevenue / totalClosedOrders) : 0;
  // Pagination
  const totalPages = Math.ceil(dayGroups.length / PAGE_SIZE);
  const pagedGroups = dayGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const toggleExpand = (dateKey: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);else
      next.add(dateKey);
      return next;
    });
  };
  // Build product breakdown for a day group
  const getProductBreakdown = (group: DayGroup) => {
    const map = new Map<
      string,
      {
        name: string;
        qty: number;
        total: number;
      }>(
    );
    for (const o of group.orders) {
      for (const item of o.items) {
        const existing = map.get(item.productName);
        if (existing) {
          existing.qty += item.quantity;
          existing.total += item.quantity * item.price;
        } else {
          map.set(item.productName, {
            name: item.productName,
            qty: item.quantity,
            total: item.quantity * item.price
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  };
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white w-full md:w-auto">
          {(['today', 'yesterday', 'custom'] as RangeMode[]).map((mode) => {
            const labels: Record<RangeMode, string> = {
              today: 'Bugun',
              yesterday: 'Kecha',
              custom: 'Dan–gacha'
            };
            return (
              <button
                key={mode}
                onClick={() => setRangeMode(mode)}
                className={clsx(
                  'flex-1 md:flex-none px-4 py-2 text-sm font-medium transition-colors',
                  rangeMode === mode ?
                  'bg-indigo-600 text-white' :
                  'text-slate-600 hover:bg-slate-50'
                )}>

                {labels[mode]}
              </button>);

          })}
        </div>

        {rangeMode === 'custom' &&
        <div className="flex items-end gap-2 w-full md:w-auto">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-slate-500">Dan</label>
              <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full" />

            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-slate-500">
                Gacha
              </label>
              <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full" />

            </div>
          </div>
        }

        <Button
          onClick={fetchData}
          variant="primary"
          className="w-full md:w-auto">

          Ko'rsatish
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ?
      <CardSkeleton count={4} /> :

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
          title="Sotilgan mahsulotlar soni"
          value={`${totalQty} ta`}
          icon={ShoppingBag}
          color="indigo" />

          <StatCard
          title="Umumiy tushum"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          color="green" />

          <StatCard
          title="Yopilgan buyurtmalar"
          value={`${totalClosedOrders} ta`}
          icon={CheckCircle}
          color="amber" />

          <StatCard
          title="O'rtacha chek"
          value={formatCurrency(avgCheck)}
          icon={Receipt}
          color="red" />

        </div>
      }

      {/* Table / List */}
      {loading ?
      <TableSkeleton /> :
      dayGroups.length === 0 ?
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <PackageOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            Tanlangan davr bo'yicha sotuvlar topilmadi.
          </p>
        </div> :

      <>
          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {pagedGroups.map((group) => {
            const isExpanded = expandedDates.has(group.dateKey);
            const products = getProductBreakdown(group);
            return (
              <div
                key={group.dateKey}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden">

                  <div
                  onClick={() => toggleExpand(group.dateKey)}
                  className="px-4 py-3.5 flex justify-between items-center cursor-pointer active:bg-slate-50">

                    <div>
                      <p className="font-semibold text-slate-900">
                        {formatDateShort(group.dateKey)}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-slate-500">
                          Sotilgan: {group.totalQty} ta
                        </p>
                        <p className="text-xs font-semibold text-indigo-700">
                          Tushum: {formatCurrency(group.totalRevenue)}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                    className={clsx(
                      'h-5 w-5 text-slate-400 transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )} />

                  </div>

                  {isExpanded &&
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="space-y-2">
                        {products.map((p) =>
                    <div
                      key={p.name}
                      className="flex justify-between items-start text-sm">

                            <span className="text-slate-700 flex-1 mr-2">
                              {p.name}
                            </span>
                            <span className="font-semibold text-slate-800 whitespace-nowrap">
                              {p.qty} ta — {formatCurrency(p.total)}
                            </span>
                          </div>
                    )}
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-200 text-right">
                        <p className="text-sm font-semibold text-indigo-700">
                          Kun bo'yicha jami:{' '}
                          {formatCurrency(group.totalRevenue)}
                        </p>
                      </div>
                    </div>
                }
                </div>);

          })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Sana
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Sotilgan mahsulotlar soni
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Umumiy tushum
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">
                      Ko'rish
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedGroups.map((group) => {
                  const isExpanded = expandedDates.has(group.dateKey);
                  const products = getProductBreakdown(group);
                  return (
                    <Fragment key={group.dateKey}>
                        <tr
                        onClick={() => toggleExpand(group.dateKey)}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">

                          <td className="px-5 py-3.5 font-medium text-slate-900">
                            {formatDateShort(group.dateKey)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 font-semibold text-sm px-3 py-1 rounded-full">
                              {group.totalQty} ta
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                            {formatCurrency(group.totalRevenue)}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <ChevronDown
                            className={clsx(
                              'h-4 w-4 text-slate-400 mx-auto transition-transform duration-200',
                              isExpanded && 'rotate-180'
                            )} />

                          </td>
                        </tr>

                        {isExpanded &&
                      <tr>
                            <td colSpan={4} className="p-0">
                              <div className="bg-slate-50 border-b border-slate-200 border-l-4 border-l-indigo-400 px-6 py-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200">
                                      <th className="pb-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Mahsulot
                                      </th>
                                      <th className="pb-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Soni
                                      </th>
                                      <th className="pb-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Jami
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {products.map((p) =>
                                <tr key={p.name}>
                                        <td className="py-2 text-slate-700 font-medium">
                                          {p.name}
                                        </td>
                                        <td className="py-2 text-center text-slate-600">
                                          {p.qty} ta
                                        </td>
                                        <td className="py-2 text-right text-slate-800 font-semibold">
                                          {formatCurrency(p.total)}
                                        </td>
                                      </tr>
                                )}
                                  </tbody>
                                </table>
                                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-end gap-1 text-sm text-slate-600">
                                  <span className="sm:mr-6">
                                    Kun bo'yicha sotilgan:{' '}
                                    <span className="font-semibold text-slate-800">
                                      {group.totalQty} ta
                                    </span>
                                  </span>
                                  <span>
                                    Kun bo'yicha jami:{' '}
                                    <span className="font-semibold text-indigo-700">
                                      {formatCurrency(group.totalRevenue)}
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                      }
                      </Fragment>);

                })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 &&
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-xl border-x border-b border-slate-200 md:border-0 md:bg-transparent">
              <span className="text-sm text-slate-500">
                Sahifa {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}>

                  Oldingi
                </Button>
                <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}>

                  Keyingi
                </Button>
              </div>
            </div>
        }
        </>
      }
    </div>);

}
// ─── Tab 2: Daily ─────────────────────────────────────────────────────────────
function DailyTab({ activeBranchId }: {activeBranchId: string;}) {
  const [date, setDate] = useState(todayStr());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const load = () => {
    setLoading(true);
    api.reports.daily(activeBranchId, date).then((d) => {
      setData(d);
    }).catch(() => {
      setData(null);
    }).finally(() => {
      setLoading(false);
    });
  };
  useEffect(() => {
    load();
  }, [activeBranchId, date]);
  return (
    <div className="space-y-5">
      <div className="flex items-center space-x-3">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
          label="Sana" />

      </div>
      {loading ?
      <CardSkeleton count={3} /> :

      data &&
      <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
            title="Tushum"
            value={formatCurrency(data.revenue)}
            icon={TrendingUp}
            color="green" />

              <StatCard
            title="Rashod"
            value={formatCurrency(data.expenses)}
            icon={TrendingDown}
            color="red" />

              <StatCard
            title="Foyda"
            value={formatCurrency(data.profit)}
            icon={DollarSign}
            color="indigo" />

            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  To'lov turlari
                </h3>
                <div className="space-y-2">
                  {[
              ['Naqd', data.cash],
              ['Karta', data.card],
              ["O'tkazma", data.transfer]].
              map(([label, val]) =>
              <div
                key={label as string}
                className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">

                      <span className="text-sm text-slate-600">{label}</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(val as number)}
                      </span>
                    </div>
              )}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Rashod turlari
                </h3>
                <div className="space-y-2">
                  {[
              ['Oylik', data.salary],
              ['Bozorlik', data.market],
              ['Boshqa', data.other]].
              map(([label, val]) =>
              <div
                key={label as string}
                className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">

                      <span className="text-sm text-slate-600">{label}</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(val as number)}
                      </span>
                    </div>
              )}
                </div>
              </div>
            </div>
          </>

      }
    </div>);

}
// ─── Tab 3: Monthly ───────────────────────────────────────────────────────────
function MonthlyTab({ activeBranchId }: {activeBranchId: string;}) {
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const load = () => {
    setLoading(true);
    api.reports.monthly(activeBranchId, from, to).then((d) => {
      setData(d);
    }).catch(() => {
      setData(null);
    }).finally(() => {
      setLoading(false);
    });
  };
  useEffect(() => {
    load();
  }, [activeBranchId]);
  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex gap-3">
          <Input
            label="Dan"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full md:w-40" />

          <Input
            label="Gacha"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full md:w-40" />

        </div>
        <Button onClick={load} variant="secondary">
          Ko'rish
        </Button>
      </div>
      {loading ?
      <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" /> :

      data &&
      <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
            title="Jami tushum"
            value={formatCurrency(data.totals.tushum)}
            icon={TrendingUp}
            color="green" />

              <StatCard
            title="Jami xarajat"
            value={formatCurrency(data.totals.xarajat)}
            icon={TrendingDown}
            color="red" />

              <StatCard
            title="Jami foyda"
            value={formatCurrency(data.totals.foyda)}
            icon={DollarSign}
            color="indigo" />

            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Kunlik ko'rsatkichlar
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.days.slice(-14)}>
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
                    fontSize: 11
                  }}
                  tickFormatter={(v) => v.slice(5)} />

                    <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: '#94a3b8',
                    fontSize: 11
                  }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`} />

                    <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    fontSize: 12
                  }}
                  formatter={(v: number) => formatCurrency(v)} />

                    <Legend
                  formatter={(v) =>
                  v === 'tushum' ?
                  'Tushum' :
                  v === 'xarajat' ?
                  'Rashod' :
                  'Foyda'
                  } />

                    <Line
                  type="monotone"
                  dataKey="tushum"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  name="tushum" />

                    <Line
                  type="monotone"
                  dataKey="xarajat"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="xarajat" />

                    <Line
                  type="monotone"
                  dataKey="foyda"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="foyda" />

                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>

      }
    </div>);

}
// ─── Tab 4: Waiter Activity ───────────────────────────────────────────────────
function WaitersTab({ activeBranchId }: {activeBranchId: string;}) {
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<WaiterActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const load = () => {
    setLoading(true);
    api.reports.waiterActivity(activeBranchId, from, to).then((d) => {
      setData(d);
    }).catch(() => {
      setData([]);
    }).finally(() => {
      setLoading(false);
    });
  };
  useEffect(() => {
    load();
  }, [activeBranchId]);
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex gap-3">
          <Input
            label="Dan"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full md:w-40" />

          <Input
            label="Gacha"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full md:w-40" />

        </div>
        <Button onClick={load} variant="secondary">
          Ko'rish
        </Button>
      </div>
      {loading ?
      <TableSkeleton /> :
      data.length === 0 ?
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Ma'lumot topilmadi</p>
        </div> :

      <>
          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {data.
          sort((a, b) => b.revenue - a.revenue).
          map((w) =>
          <div
            key={w.waiterId}
            className="bg-white rounded-xl border border-slate-200 p-4">

                  <div className="flex justify-between items-start mb-3">
                    <div className="font-medium text-slate-900">
                      {w.waiterName}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Tushum</div>
                      <div className="font-bold text-indigo-600">
                        {formatCurrency(w.revenue)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="flex justify-between pr-2 border-r border-slate-100">
                      <span className="text-slate-500">Ochgan:</span>
                      <span className="font-medium">{w.openedOrders}</span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span className="text-slate-500">Yopilgan:</span>
                      <span className="font-medium">{w.closedOrders}</span>
                    </div>
                    <div className="flex justify-between pr-2 border-r border-slate-100">
                      <span className="text-slate-500">O'rtacha:</span>
                      <span className="font-medium">
                        {formatCurrency(w.avgCheck)}
                      </span>
                    </div>
                    <div className="flex justify-between pl-2">
                      <span className="text-slate-500">Mahsulot:</span>
                      <span className="font-medium">{w.itemsAdded}</span>
                    </div>
                  </div>
                </div>
          )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 text-left font-medium">
                      Ofitsant
                    </th>
                    <th className="px-5 py-3.5 text-center font-medium">
                      Ochgan
                    </th>
                    <th className="px-5 py-3.5 text-center font-medium">
                      Yopilgan
                    </th>
                    <th className="px-5 py-3.5 text-right font-medium">
                      Tushum
                    </th>
                    <th className="px-5 py-3.5 text-right font-medium">
                      O'rtacha chek
                    </th>
                    <th className="px-5 py-3.5 text-center font-medium">
                      Mahsulotlar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.
                sort((a, b) => b.revenue - a.revenue).
                map((w) =>
                <tr
                  key={w.waiterId}
                  className="hover:bg-slate-50 transition-colors">

                        <td className="px-5 py-4 font-medium text-slate-900">
                          {w.waiterName}
                        </td>
                        <td className="px-5 py-4 text-center text-slate-600">
                          {w.openedOrders}
                        </td>
                        <td className="px-5 py-4 text-center text-slate-600">
                          {w.closedOrders}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-indigo-600">
                          {formatCurrency(w.revenue)}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600">
                          {formatCurrency(w.avgCheck)}
                        </td>
                        <td className="px-5 py-4 text-center text-slate-600">
                          {w.itemsAdded}
                        </td>
                      </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      }
    </div>);

}
