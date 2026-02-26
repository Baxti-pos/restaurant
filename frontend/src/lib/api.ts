import {
  Branch,
  Waiter,
  TableItem,
  Category,
  Product,
  Order,
  OrderItem,
  Expense,
  User,
  DashboardStats,
  WaiterActivity } from
'./types';
import {
  mockBranches,
  mockWaiters,
  mockTables,
  mockCategories,
  mockProducts,
  mockOrders,
  mockExpenses,
  mockOwner } from
'./mockData';

// In-memory mutable state
let branches = [...mockBranches];
let waiters = [...mockWaiters];
let tables = [...mockTables];
let categories = [...mockCategories];
let products = [...mockProducts];
let orders = [...mockOrders];
let expenses = [...mockExpenses];

const delay = (ms = 350) => new Promise((res) => setTimeout(res, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

export const api = {
  auth: {
    login: async (
    phone: string,
    password: string)
    : Promise<{user: User;token: string;}> => {
      await delay(600);
      const cleanPhone = phone.replace(/\s/g, '');
      if (
      (cleanPhone === '+998901234567' ||
      cleanPhone === '998901234567' ||
      cleanPhone === '901234567') &&
      password === 'admin123')
      {
        return {
          user: mockOwner,
          token: `mock-jwt-${mockOwner.id}-${Date.now()}`
        };
      }
      throw new Error("Telefon raqam yoki parol noto'g'ri");
    },
    logout: async (): Promise<void> => {
      await delay(200);
    }
  },

  branches: {
    list: async (): Promise<Branch[]> => {
      await delay();
      return [...branches];
    },
    create: async (data: Omit<Branch, 'id'>): Promise<Branch> => {
      await delay();
      const item: Branch = { ...data, id: 'b' + uid() };
      branches.push(item);
      return item;
    },
    update: async (id: string, data: Partial<Branch>): Promise<Branch> => {
      await delay();
      branches = branches.map((b) => b.id === id ? { ...b, ...data } : b);
      return branches.find((b) => b.id === id)!;
    },
    delete: async (id: string): Promise<void> => {
      await delay();
      branches = branches.filter((b) => b.id !== id);
    }
  },

  waiters: {
    listByBranch: async (branchId: string): Promise<Waiter[]> => {
      await delay();
      return waiters.filter((w) => w.branchId === branchId);
    },
    create: async (data: Omit<Waiter, 'id' | 'createdAt'>): Promise<Waiter> => {
      await delay();
      const item: Waiter = {
        ...data,
        id: 'w' + uid(),
        createdAt: new Date().toISOString()
      };
      waiters.push(item);
      return item;
    },
    update: async (id: string, data: Partial<Waiter>): Promise<Waiter> => {
      await delay();
      waiters = waiters.map((w) => w.id === id ? { ...w, ...data } : w);
      return waiters.find((w) => w.id === id)!;
    },
    delete: async (id: string): Promise<void> => {
      await delay();
      waiters = waiters.filter((w) => w.id !== id);
    }
  },

  tables: {
    listByBranch: async (branchId: string): Promise<TableItem[]> => {
      await delay();
      return tables.filter((t) => t.branchId === branchId);
    },
    create: async (data: Omit<TableItem, 'id'>): Promise<TableItem> => {
      await delay();
      const item: TableItem = { ...data, id: 't' + uid() };
      tables.push(item);
      return item;
    },
    update: async (
    id: string,
    data: Partial<TableItem>)
    : Promise<TableItem> => {
      await delay();
      tables = tables.map((t) => t.id === id ? { ...t, ...data } : t);
      return tables.find((t) => t.id === id)!;
    },
    delete: async (id: string): Promise<void> => {
      await delay();
      tables = tables.filter((t) => t.id !== id);
    }
  },

  categories: {
    listByBranch: async (branchId: string): Promise<Category[]> => {
      await delay();
      return categories.
      filter((c) => c.branchId === branchId).
      sort((a, b) => a.sortOrder - b.sortOrder);
    },
    create: async (data: Omit<Category, 'id'>): Promise<Category> => {
      await delay();
      const item: Category = { ...data, id: 'c' + uid() };
      categories.push(item);
      return item;
    },
    update: async (id: string, data: Partial<Category>): Promise<Category> => {
      await delay();
      categories = categories.map((c) => c.id === id ? { ...c, ...data } : c);
      return categories.find((c) => c.id === id)!;
    },
    delete: async (id: string): Promise<void> => {
      await delay();
      categories = categories.filter((c) => c.id !== id);
    }
  },

  products: {
    listByBranch: async (branchId: string): Promise<Product[]> => {
      await delay();
      return products.filter((p) => p.branchId === branchId);
    },
    create: async (data: Omit<Product, 'id'>): Promise<Product> => {
      await delay();
      const item: Product = { ...data, id: 'p' + uid() };
      products.push(item);
      return item;
    },
    update: async (id: string, data: Partial<Product>): Promise<Product> => {
      await delay();
      products = products.map((p) => p.id === id ? { ...p, ...data } : p);
      return products.find((p) => p.id === id)!;
    },
    delete: async (id: string): Promise<void> => {
      await delay();
      products = products.filter((p) => p.id !== id);
    }
  },

  expenses: {
    listByBranchAndDate: async (
    branchId: string,
    date: string)
    : Promise<Expense[]> => {
      await delay();
      return expenses.filter((e) => e.branchId === branchId && e.date === date);
    },
    create: async (
    data: Omit<Expense, 'id' | 'createdAt'>)
    : Promise<Expense> => {
      await delay();
      const item: Expense = {
        ...data,
        id: 'e' + uid(),
        createdAt: new Date().toISOString()
      };
      expenses.push(item);
      return item;
    },
    update: async (id: string, data: Partial<Expense>): Promise<Expense> => {
      await delay();
      expenses = expenses.map((e) => e.id === id ? { ...e, ...data } : e);
      return expenses.find((e) => e.id === id)!;
    },
    delete: async (id: string): Promise<void> => {
      await delay();
      expenses = expenses.filter((e) => e.id !== id);
    }
  },

  orders: {
    listByBranch: async (
    branchId: string,
    filters?: {status?: string;from?: string;to?: string;})
    : Promise<Order[]> => {
      await delay();
      let result = orders.filter((o) => o.branchId === branchId);
      if (filters?.status && filters.status !== 'all') {
        result = result.filter((o) => o.status === filters.status);
      }
      if (filters?.from)
      result = result.filter(
        (o) => o.createdAt >= filters.from! + 'T00:00:00Z'
      );
      if (filters?.to)
      result = result.filter((o) => o.createdAt <= filters.to! + 'T23:59:59Z');
      return result.sort(
        (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },
    getById: async (id: string): Promise<Order> => {
      await delay();
      return orders.find((o) => o.id === id)!;
    },
    create: async (data: Omit<Order, 'id' | 'closedAt'>): Promise<Order> => {
      await delay();
      const item: Order = { ...data, id: 'o' + uid() };
      orders.push(item);
      // Mark table as occupied
      tables = tables.map((t) =>
      t.id === data.tableId ?
      { ...t, status: 'occupied' as const, currentOrderId: item.id } :
      t
      );
      return item;
    },
    updateItems: async (id: string, items: OrderItem[]): Promise<Order> => {
      await delay();
      const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
      orders = orders.map((o) => o.id === id ? { ...o, items, total } : o);
      return orders.find((o) => o.id === id)!;
    },
    close: async (
    id: string,
    paymentType: string,
    _amount: number)
    : Promise<Order> => {
      await delay();
      orders = orders.map((o) =>
      o.id === id ?
      {
        ...o,
        status: 'closed' as const,
        paymentType: paymentType as any,
        closedAt: new Date().toISOString()
      } :
      o
      );
      // Free the table
      const order = orders.find((o) => o.id === id)!;
      tables = tables.map((t) =>
      t.id === order.tableId ?
      { ...t, status: 'empty' as const, currentOrderId: undefined } :
      t
      );
      return order;
    }
  },

  dashboard: {
    getStats: async (branchId: string): Promise<DashboardStats> => {
      await delay(500);
      const todayStr = new Date().toISOString().split('T')[0];
      const branchOrders = orders.filter((o) => o.branchId === branchId);
      const todayOrders = branchOrders.filter((o) =>
      o.createdAt.startsWith(todayStr)
      );
      const todayExpenses = expenses.filter(
        (e) => e.branchId === branchId && e.date === todayStr
      );
      const todayRevenue = todayOrders.
      filter((o) => o.status === 'closed').
      reduce((s, o) => s + o.total, 0);
      const todayExpTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

      const days = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
      const revenueChart = days.map((d, i) => ({
        date: d,
        tushum: 1200000 + i * 300000 + Math.random() * 200000,
        xarajat: 300000 + i * 50000 + Math.random() * 100000
      }));

      const salaryTotal = expenses.
      filter((e) => e.branchId === branchId && e.type === 'salary').
      reduce((s, e) => s + e.amount, 0);
      const marketTotal = expenses.
      filter((e) => e.branchId === branchId && e.type === 'market').
      reduce((s, e) => s + e.amount, 0);
      const otherTotal = expenses.
      filter((e) => e.branchId === branchId && e.type === 'other').
      reduce((s, e) => s + e.amount, 0);

      return {
        todayRevenue,
        todayExpenses: todayExpTotal,
        todayProfit: todayRevenue - todayExpTotal,
        openOrdersCount: branchOrders.filter((o) => o.status === 'open').length,
        revenueChart,
        expensesByType: [
        { name: 'Ish haqi', value: salaryTotal || 2000000 },
        { name: 'Bozor xarajati', value: marketTotal || 1650000 },
        { name: 'Boshqa xarajat', value: otherTotal || 350000 }],

        ordersChart: days.map((d, i) => ({
          date: d,
          soni: 40 + i * 8 + Math.floor(Math.random() * 15)
        })),
        openOrders: branchOrders.filter((o) => o.status === 'open')
      };
    }
  },

  reports: {
    daily: async (branchId: string, date: string) => {
      await delay();
      const dayOrders = orders.filter(
        (o) =>
        o.branchId === branchId &&
        o.createdAt.startsWith(date) &&
        o.status === 'closed'
      );
      const dayExpenses = expenses.filter(
        (e) => e.branchId === branchId && e.date === date
      );
      const revenue = dayOrders.reduce((s, o) => s + o.total, 0);
      const expTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
      return {
        revenue,
        expenses: expTotal,
        profit: revenue - expTotal,
        cash: dayOrders.
        filter((o) => o.paymentType === 'cash').
        reduce((s, o) => s + o.total, 0),
        card: dayOrders.
        filter((o) => o.paymentType === 'card').
        reduce((s, o) => s + o.total, 0),
        transfer: dayOrders.
        filter((o) => o.paymentType === 'transfer').
        reduce((s, o) => s + o.total, 0),
        salary: dayExpenses.
        filter((e) => e.type === 'salary').
        reduce((s, e) => s + e.amount, 0),
        market: dayExpenses.
        filter((e) => e.type === 'market').
        reduce((s, e) => s + e.amount, 0),
        other: dayExpenses.
        filter((e) => e.type === 'other').
        reduce((s, e) => s + e.amount, 0)
      };
    },
    monthly: async (branchId: string, from: string, to: string) => {
      await delay();
      const days: {
        date: string;
        tushum: number;
        xarajat: number;
        foyda: number;
      }[] = [];
      const start = new Date(from),
        end = new Date(to);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().split('T')[0];
        const rev = 800000 + Math.random() * 1500000;
        const exp = 200000 + Math.random() * 500000;
        days.push({
          date: ds,
          tushum: Math.round(rev),
          xarajat: Math.round(exp),
          foyda: Math.round(rev - exp)
        });
      }
      return {
        days,
        totals: {
          tushum: days.reduce((s, d) => s + d.tushum, 0),
          xarajat: days.reduce((s, d) => s + d.xarajat, 0),
          foyda: days.reduce((s, d) => s + d.foyda, 0)
        }
      };
    },
    waiterActivity: async (
    branchId: string,
    _from: string,
    _to: string)
    : Promise<WaiterActivity[]> => {
      await delay();
      return waiters.
      filter((w) => w.branchId === branchId).
      map((w) => {
        const wOrders = orders.filter(
          (o) => o.branchId === branchId && o.waiterId === w.id
        );
        const closed = wOrders.filter((o) => o.status === 'closed');
        const rev = closed.reduce((s, o) => s + o.total, 0);
        return {
          waiterId: w.id,
          waiterName: w.name,
          openedOrders: wOrders.length,
          closedOrders: closed.length,
          revenue: rev,
          avgCheck: closed.length ? Math.round(rev / closed.length) : 0,
          itemsAdded: wOrders.reduce(
            (s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0),
            0
          )
        };
      });
    }
  }
};