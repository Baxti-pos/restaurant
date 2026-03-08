import { getAuth } from './auth';
import { toLocalDateKey, todayStr } from './formatters';
import { hasPermission } from './permissions';
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
  OwnerProfile,
  Manager,
  DashboardStats,
  WaiterActivity,
  PaymentType,
  ExpenseType } from
'./types';

type BackendRole = 'OWNER' | 'MANAGER' | 'WAITER';
type BackendTableStatus = 'AVAILABLE' | 'OCCUPIED' | 'DISABLED';
type BackendOrderStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
type BackendPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED';

interface BackendEnvelope<T> {
  message?: string;
  data?: T;
}

interface BackendBranch {
  id: string;
  name: string;
  address: string | null;
  shiftEnd?: string | null;
  isActive: boolean;
}

interface BackendAuthUser {
  id: string;
  fullName: string;
  phone: string | null;
  role: BackendRole;
  permissions?: string[];
  branchId: string | null;
  activeBranchId: string | null;
}

interface BackendLoginResult {
  accessToken: string;
  requiresBranchSelection: boolean;
  user: BackendAuthUser;
  branches: BackendBranch[];
}

interface BackendOwnerProfile {
  id: string;
  fullName: string;
  phone: string | null;
  role: BackendRole;
  createdAt: string;
  updatedAt: string;
}

interface BackendManagerBranch {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

interface BackendManager {
  id: string;
  fullName: string;
  phone: string | null;
  permissions: string[];
  role: BackendRole;
  isActive: boolean;
  branches: BackendManagerBranch[];
  createdAt: string;
  updatedAt: string;
}

interface BackendWaiter {
  id: string;
  branchId: string | null;
  fullName: string;
  phone: string | null;
  salesSharePercent: string | number;
  isActive: boolean;
  createdAt: string;
}

interface BackendCategory {
  id: string;
  branchId: string;
  name: string;
  sortOrder: number;
  isActive?: boolean;
}

interface BackendProduct {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  price: string | number;
  isActive: boolean;
  sortOrder?: number;
}

interface BackendTableOpenOrder {
  id: string;
  waiterId?: string | null;
  waiter?: {
    id: string;
    fullName: string;
  } | null;
}

interface BackendTable {
  id: string;
  branchId: string;
  name: string;
  status: BackendTableStatus;
  orders?: BackendTableOpenOrder[];
}

interface BackendOrderItem {
  id: string;
  productId: string | null;
  productName: string;
  unitPrice: string | number;
  quantity: number;
}

interface BackendOrder {
  id: string;
  branchId: string;
  tableId: string | null;
  waiterId: string | null;
  status: BackendOrderStatus;
  totalAmount: string | number;
  paymentMethod: BackendPaymentMethod | null;
  openedAt: string;
  closedAt: string | null;
  table: {
    id: string;
    name: string;
  } | null;
  waiter: {
    id: string;
    fullName: string;
  } | null;
  items: BackendOrderItem[];
}

interface BackendExpense {
  id: string;
  branchId: string;
  title: string;
  amount: string | number;
  description: string | null;
  spentAt: string;
  createdAt: string;
}

interface BackendDashboardPayload {
  stats: {
    orders: {
      openCount: number;
    };
    finance: {
      salesTotal: number;
      expenseTotal: number;
    };
  };
}

interface BackendSalesSummaryDay {
  date: string;
  ordersCount: number;
  totalAmount: number;
}

interface BackendSalesSummaryPayload {
  summary: {
    totalAmount: number;
  };
  byDay: BackendSalesSummaryDay[];
}

interface BackendWaiterActivityRow {
  waiterId: string;
  fullName: string;
  openOrdersCount: number;
  closedOrdersCount: number;
  salesTotal: number;
  shareAmount: number;
  salesSharePercent: number;
  itemsCount: number;
}

interface BackendWaiterActivityPayload {
  data: BackendWaiterActivityRow[];
}

interface BackendMeEarningsPeriod {
  from: string;
  to: string;
  closedOrdersCount: number;
  salesTotal: string | number;
  commissionTotal: string | number;
}

interface BackendMeShiftItem {
  id: string;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
}

interface BackendMeEarningsPayload {
  waiter: {
    id: string;
    fullName: string;
    salesSharePercent: string | number;
  };
  baseDate: string;
  day: BackendMeEarningsPeriod;
  month: BackendMeEarningsPeriod;
  year: BackendMeEarningsPeriod;
  shifts: BackendMeShiftItem[];
  shiftSummary: {
    startedCount: number;
    endedCount: number;
    lastStartedAt: string | null;
    lastEndedAt: string | null;
  };
}

interface WaiterCreateInput {
  name: string;
  phone: string;
  password: string;
  isEnabled: boolean;
  salesSharePercent: number;
}

interface WaiterUpdateInput {
  name?: string;
  phone?: string;
  password?: string;
  isEnabled?: boolean;
  salesSharePercent?: number;
}

const API_BASE_URL =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '/api';
const DEFAULT_SHIFT_START = '08:00';
const DEFAULT_SHIFT_END = '22:00';
const EXPENSE_META_PREFIX = '__baxti_expense_meta__:';

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const toDateOnly = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return todayStr();
  }

  return toLocalDateKey(parsed);
};

const buildQuery = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : '';
};

const extractErrorMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as { message?: unknown };
  return typeof candidate.message === 'string' ? candidate.message : null;
};

const request = async <T>(
  path: string,
  options: (RequestInit & { skipAuth?: boolean }) = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const auth = getAuth();

  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth && auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
    extractErrorMessage(payload) ??
    `So'rov bajarilmadi (${response.status})`;
    throw new Error(message);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as BackendEnvelope<T>).data as T;
  }

  return payload as T;
};

const mapRole = (role: BackendRole): User['role'] =>
role === 'OWNER' ? 'owner' :
role === 'MANAGER' ? 'manager' :
'waiter';

const mapUser = (user: BackendAuthUser): User => ({
  id: user.id,
  name: user.fullName,
  phone: user.phone ?? '',
  role: mapRole(user.role),
  permissions:
  Array.isArray(user.permissions) ?
  user.permissions.filter((permission): permission is string => typeof permission === 'string') :
  []
});

const mapOwnerProfile = (profile: BackendOwnerProfile): OwnerProfile => ({
  id: profile.id,
  fullName: profile.fullName,
  phone: profile.phone ?? '',
  role: mapRole(profile.role),
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt
});

const mapManager = (manager: BackendManager): Manager => ({
  id: manager.id,
  fullName: manager.fullName,
  phone: manager.phone ?? '',
  permissions:
  Array.isArray(manager.permissions) ?
  manager.permissions.filter((permission): permission is string => typeof permission === 'string') :
  [],
  isActive: manager.isActive,
  branches: (manager.branches ?? []).map((branch) => ({
    id: branch.id,
    name: branch.name,
    address: branch.address ?? '',
    isActive: branch.isActive
  })),
  createdAt: manager.createdAt,
  updatedAt: manager.updatedAt
});

const mapBranch = (branch: BackendBranch): Branch => ({
  id: branch.id,
  name: branch.name,
  address: branch.address ?? '',
  shiftStart: DEFAULT_SHIFT_START,
  shiftEnd: branch.shiftEnd ?? DEFAULT_SHIFT_END,
  timezone: 'Asia/Tashkent',
  isActive: branch.isActive
});

const mapWaiter = (waiter: BackendWaiter): Waiter => ({
  id: waiter.id,
  branchId: waiter.branchId ?? '',
  name: waiter.fullName,
  phone: waiter.phone ?? '',
  isEnabled: waiter.isActive,
  salesSharePercent: toNumber(waiter.salesSharePercent, 8),
  shiftStatus: waiter.isActive ? 'not_started' : 'ended',
  createdAt: waiter.createdAt
});

const mapTableStatus = (status: BackendTableStatus): TableItem['status'] => {
  if (status === 'OCCUPIED') {
    return 'occupied';
  }

  if (status === 'DISABLED') {
    return 'closing';
  }

  return 'empty';
};

const toBackendTableStatus = (status?: TableItem['status']) => {
  if (status === 'occupied') {
    return 'OCCUPIED' as const;
  }

  if (status === 'closing') {
    return 'DISABLED' as const;
  }

  return 'AVAILABLE' as const;
};

const mapTable = (table: BackendTable): TableItem => ({
  id: table.id,
  branchId: table.branchId,
  name: table.name,
  status: mapTableStatus(table.status),
  currentOrderId: table.orders?.[0]?.id,
  currentOrderWaiterId: table.orders?.[0]?.waiter?.id ?? table.orders?.[0]?.waiterId ?? undefined,
  currentOrderWaiterName: table.orders?.[0]?.waiter?.fullName ?? undefined
});

const mapCategory = (category: BackendCategory): Category => ({
  id: category.id,
  branchId: category.branchId,
  name: category.name,
  sortOrder: category.sortOrder
});

const mapProduct = (product: BackendProduct): Product => ({
  id: product.id,
  branchId: product.branchId,
  categoryId: product.categoryId,
  name: product.name,
  price: toNumber(product.price),
  isActive: product.isActive
});

const mapPaymentType = (
  method: BackendPaymentMethod | null
): Order['paymentType'] => {
  if (!method) {
    return undefined;
  }

  if (method === 'CASH') {
    return 'cash';
  }

  if (method === 'CARD') {
    return 'card';
  }

  if (method === 'TRANSFER') {
    return 'transfer';
  }

  return undefined;
};

const toBackendPaymentMethod = (paymentType: PaymentType): BackendPaymentMethod => {
  if (paymentType === 'cash') {
    return 'CASH';
  }

  if (paymentType === 'card') {
    return 'CARD';
  }

  return 'TRANSFER';
};

const mapOrderItem = (item: BackendOrderItem): OrderItem => ({
  id: item.id,
  productId: item.productId ?? '',
  productName: item.productName,
  quantity: item.quantity,
  price: toNumber(item.unitPrice)
});

const mapOrder = (order: BackendOrder): Order => ({
  id: order.id,
  branchId: order.branchId,
  tableId: order.tableId ?? order.table?.id ?? '',
  tableName: order.table?.name ?? 'Stol',
  waiterId: order.waiterId ?? order.waiter?.id ?? '',
  waiterName: order.waiter?.fullName ?? 'Noma\'lum',
  status: order.status === 'CLOSED' ? 'closed' : 'open',
  items: order.items.map(mapOrderItem),
  total: toNumber(order.totalAmount),
  paymentType: mapPaymentType(order.paymentMethod),
  createdAt: order.openedAt,
  closedAt: order.closedAt ?? undefined
});

const normalizeExpenseType = (value: unknown): ExpenseType => {
  if (value === 'salary' || value === 'market' || value === 'other') {
    return value;
  }

  return 'other';
};

const encodeExpenseDescription = (type: ExpenseType, note?: string) => {
  const payload = {
    type,
    note: note?.trim() ?? ''
  };

  return `${EXPENSE_META_PREFIX}${JSON.stringify(payload)}`;
};

const decodeExpenseDescription = (description: string | null) => {
  if (!description) {
    return {
      type: 'other' as ExpenseType,
      note: ''
    };
  }

  if (!description.startsWith(EXPENSE_META_PREFIX)) {
    return {
      type: 'other' as ExpenseType,
      note: description
    };
  }

  const encoded = description.slice(EXPENSE_META_PREFIX.length);
  try {
    const parsed = JSON.parse(encoded) as { type?: unknown; note?: unknown };
    return {
      type: normalizeExpenseType(parsed.type),
      note: typeof parsed.note === 'string' ? parsed.note : ''
    };
  } catch {
    return {
      type: 'other' as ExpenseType,
      note: ''
    };
  }
};

const mapExpense = (expense: BackendExpense): Expense => {
  const meta = decodeExpenseDescription(expense.description);

  return {
    id: expense.id,
    branchId: expense.branchId,
    type: meta.type,
    name: expense.title,
    amount: toNumber(expense.amount),
    note: meta.note || undefined,
    date: toDateOnly(expense.spentAt),
    createdAt: expense.createdAt
  };
};

const shiftDate = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toLocalDateKey(date);
};

const getDayRange = (date: string) => ({
  from: date,
  to: date
});

export const api = {
  auth: {
    login: async (
    phone: string,
    password: string)
    : Promise<{
      user: User;
      token: string;
      requiresBranchSelection: boolean;
      branches: Branch[];
      activeBranchId: string | null;
    }> => {
      const data = await request<BackendLoginResult>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({
          phone,
          password
        })
      });

      return {
        user: mapUser(data.user),
        token: data.accessToken,
        requiresBranchSelection: data.requiresBranchSelection,
        branches: (data.branches ?? []).map(mapBranch),
        activeBranchId: data.user.activeBranchId
      };
    },

    selectBranch: async (
    branchId: string)
    : Promise<{
      token: string;
      branch: Branch;
    }> => {
      const data = await request<{
        accessToken: string;
        branch: BackendBranch;
      }>('/auth/select-branch', {
        method: 'POST',
        body: JSON.stringify({ branchId })
      });

      return {
        token: data.accessToken,
        branch: mapBranch(data.branch)
      };
    },

    logout: async (): Promise<void> => {
      return Promise.resolve();
    }
  },

  ownerProfile: {
    get: async (): Promise<OwnerProfile> => {
      const profile = await request<BackendOwnerProfile>('/auth/me');
      return mapOwnerProfile(profile);
    },

    update: async (payload: {
      fullName: string;
      phone: string;
      currentPassword?: string;
      newPassword?: string;
    }): Promise<{profile: OwnerProfile;token: string;}> => {
      const data = await request<{
        profile: BackendOwnerProfile;
        accessToken: string;
      }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return {
        profile: mapOwnerProfile(data.profile),
        token: data.accessToken
      };
    }
  },

  branches: {
    list: async (): Promise<Branch[]> => {
      const rows = await request<BackendBranch[]>('/branches');
      return rows.map(mapBranch);
    },

    create: async (data: Omit<Branch, 'id'>): Promise<Branch> => {
      const created = await request<BackendBranch>('/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          address: data.address,
          shiftEnd: data.shiftEnd,
          isActive: data.isActive
        })
      });

      return mapBranch(created);
    },

    update: async (id: string, data: Partial<Branch>): Promise<Branch> => {
      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.address !== undefined) payload.address = data.address;
      if (data.shiftEnd !== undefined) payload.shiftEnd = data.shiftEnd;
      if (data.isActive !== undefined) payload.isActive = data.isActive;

      const updated = await request<BackendBranch>(`/branches/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return mapBranch(updated);
    },

    delete: async (id: string): Promise<void> => {
      await request<BackendBranch>(`/branches/${id}`, {
        method: 'DELETE'
      });
    }
  },

  waiters: {
    listByBranch: async (_branchId: string): Promise<Waiter[]> => {
      const rows = await request<BackendWaiter[]>('/waiters');
      return rows.map(mapWaiter);
    },

    create: async (data: WaiterCreateInput): Promise<Waiter> => {
      const created = await request<BackendWaiter>('/waiters', {
        method: 'POST',
        body: JSON.stringify({
          fullName: data.name,
          phone: data.phone || null,
          password: data.password,
          salesSharePercent: data.salesSharePercent,
          isActive: data.isEnabled
        })
      });

      return mapWaiter(created);
    },

    update: async (id: string, data: WaiterUpdateInput): Promise<Waiter> => {
      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) payload.fullName = data.name;
      if (data.phone !== undefined) payload.phone = data.phone || null;
      if (data.password !== undefined) payload.password = data.password;
      if (data.isEnabled !== undefined) payload.isActive = data.isEnabled;
      if (data.salesSharePercent !== undefined) {
        payload.salesSharePercent = data.salesSharePercent;
      }

      const updated = await request<BackendWaiter>(`/waiters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return mapWaiter(updated);
    },

    delete: async (id: string): Promise<void> => {
      await request<BackendWaiter>(`/waiters/${id}`, {
        method: 'DELETE'
      });
    }
  },

  managers: {
    listPermissions: async (): Promise<
      Array<{
        key: string;
        label: string;
        description: string;
      }>
    > => {
      const data = await request<{
        permissions: string[];
        predefined: Array<{key: string;label: string;description: string;}>;
      }>('/managers/permissions');

      return data.predefined ?? [];
    },

    list: async (): Promise<Manager[]> => {
      const rows = await request<BackendManager[]>('/managers');
      return rows.map(mapManager);
    },

    create: async (payload: {
      fullName: string;
      phone: string;
      password: string;
      branchIds: string[];
      permissions: string[];
      isActive?: boolean;
    }): Promise<Manager> => {
      const created = await request<BackendManager>('/managers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      return mapManager(created);
    },

    update: async (
      id: string,
      payload: {
        fullName?: string;
        phone?: string;
        password?: string;
        branchIds?: string[];
        permissions?: string[];
        isActive?: boolean;
      }
    ): Promise<Manager> => {
      const updated = await request<BackendManager>(`/managers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return mapManager(updated);
    },

    delete: async (id: string): Promise<void> => {
      await request<{id: string;}>(`/managers/${id}`, {
        method: 'DELETE'
      });
    }
  },

  tables: {
    listByBranch: async (_branchId: string): Promise<TableItem[]> => {
      const rows = await request<BackendTable[]>('/tables');
      return rows.
      filter((table) => table.status !== 'DISABLED').
      map(mapTable);
    },

    create: async (data: Omit<TableItem, 'id'>): Promise<TableItem> => {
      const created = await request<BackendTable>('/tables', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          status: toBackendTableStatus(data.status)
        })
      });

      return mapTable(created);
    },

    update: async (
    id: string,
    data: Partial<TableItem>)
    : Promise<TableItem> => {
      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.status !== undefined) payload.status = toBackendTableStatus(data.status);

      const updated = await request<BackendTable>(`/tables/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return mapTable(updated);
    },

    delete: async (id: string): Promise<void> => {
      await request<BackendTable>(`/tables/${id}`, {
        method: 'DELETE'
      });
    }
  },

  categories: {
    listByBranch: async (_branchId: string): Promise<Category[]> => {
      const rows = await request<BackendCategory[]>('/categories');
      return rows.
      filter((category) => category.isActive !== false).
      map(mapCategory).
      sort((a, b) => a.sortOrder - b.sortOrder);
    },

    create: async (data: Omit<Category, 'id'>): Promise<Category> => {
      const created = await request<BackendCategory>('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          sortOrder: data.sortOrder
        })
      });

      return mapCategory(created);
    },

    update: async (id: string, data: Partial<Category>): Promise<Category> => {
      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;

      const updated = await request<BackendCategory>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return mapCategory(updated);
    },

    delete: async (id: string): Promise<void> => {
      await request<BackendCategory>(`/categories/${id}`, {
        method: 'DELETE'
      });
    }
  },

  products: {
    listByBranch: async (_branchId: string): Promise<Product[]> => {
      const rows = await request<BackendProduct[]>('/products');
      return rows.map(mapProduct);
    },

    create: async (data: Omit<Product, 'id'>): Promise<Product> => {
      const created = await request<BackendProduct>('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          categoryId: data.categoryId,
          price: data.price,
          isActive: data.isActive
        })
      });

      return mapProduct(created);
    },

    update: async (id: string, data: Partial<Product>): Promise<Product> => {
      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) payload.name = data.name;
      if (data.categoryId !== undefined) payload.categoryId = data.categoryId;
      if (data.price !== undefined) payload.price = data.price;
      if (data.isActive !== undefined) payload.isActive = data.isActive;

      const updated = await request<BackendProduct>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return mapProduct(updated);
    },

    delete: async (id: string): Promise<void> => {
      await request<BackendProduct>(`/products/${id}`, {
        method: 'DELETE'
      });
    }
  },

  expenses: {
    listByBranchAndDate: async (
    _branchId: string,
    date: string)
    : Promise<Expense[]> => {
      const query = buildQuery(getDayRange(date));
      const rows = await request<BackendExpense[]>(`/expenses${query}`);
      return rows.map(mapExpense);
    },

    create: async (
    data: Omit<Expense, 'id' | 'createdAt'>)
    : Promise<Expense> => {
      const created = await request<BackendExpense>('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          title: data.name,
          amount: data.amount,
          description: encodeExpenseDescription(data.type, data.note),
          spentAt: data.date
        })
      });

      return mapExpense(created);
    },

    update: async (id: string, data: Partial<Expense>): Promise<Expense> => {
      const payload: Record<string, unknown> = {};

      if (data.name !== undefined) payload.title = data.name;
      if (data.amount !== undefined) payload.amount = data.amount;
      if (data.date !== undefined) payload.spentAt = data.date;
      if (data.type !== undefined || data.note !== undefined) {
        payload.description = encodeExpenseDescription(
          data.type ?? 'other',
          data.note
        );
      }

      const updated = await request<BackendExpense>(`/expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      return mapExpense(updated);
    },

    delete: async (id: string): Promise<void> => {
      await request<BackendExpense>(`/expenses/${id}`, {
        method: 'DELETE'
      });
    }
  },

  orders: {
    listByBranch: async (
    _branchId: string,
    filters?: { status?: string; from?: string; to?: string })
    : Promise<Order[]> => {
      const statusRaw = filters?.status?.toLowerCase();
      const status =
      statusRaw === 'open' ? 'OPEN' :
      statusRaw === 'closed' ? 'CLOSED' :
      statusRaw === 'all' ? 'ALL' :
      undefined;

      const query = buildQuery({
        status,
        from: filters?.from,
        to: filters?.to
      });

      const rows = await request<BackendOrder[]>(`/orders${query}`);
      return rows.map(mapOrder);
    },

    getById: async (id: string): Promise<Order> => {
      const order = await request<BackendOrder>(`/orders/${id}`);
      return mapOrder(order);
    },

    create: async (data: Omit<Order, 'id' | 'closedAt'>): Promise<Order> => {
      const opened = await request<{
        order: BackendOrder;
      }>('/orders/open-for-table', {
        method: 'POST',
        body: JSON.stringify({
          tableId: data.tableId
        })
      });

      let orderId = opened.order.id;

      for (const item of data.items) {
        if (!item.productId) {
          continue;
        }

        const quantity = Math.max(1, Math.trunc(item.quantity || 1));
        const added = await request<{
          order: BackendOrder;
        }>(`/orders/${orderId}/items`, {
          method: 'POST',
          body: JSON.stringify({
            productId: item.productId,
            quantity
          })
        });

        orderId = added.order.id;
      }

      const finalOrder = await request<BackendOrder>(`/orders/${orderId}`);
      return mapOrder(finalOrder);
    },

    updateItems: async (id: string, items: OrderItem[]): Promise<Order> => {
      const currentOrder = await request<BackendOrder>(`/orders/${id}`);
      const authUser = getAuth().user;
      const canEditItems = hasPermission(authUser, 'ORDERS_EDIT');

      const currentItemsMap = new Map(currentOrder.items.map((item) => [item.id, item]));
      const nextItemsMap = new Map(
        items.
        filter((item) => currentItemsMap.has(item.id)).
        map((item) => [item.id, item] as const)
      );

      for (const currentItem of currentOrder.items) {
        if (!nextItemsMap.has(currentItem.id) && canEditItems) {
          await request<{ order: BackendOrder }>(`/orders/${id}/items/${currentItem.id}`, {
            method: 'DELETE'
          });
        }
      }

      for (const [itemId, nextItem] of nextItemsMap.entries()) {
        const currentItem = currentItemsMap.get(itemId);
        if (!currentItem) {
          continue;
        }

        const currentQty = currentItem.quantity;
        const nextQty = Math.max(1, Math.trunc(nextItem.quantity || 1));
        const currentPrice = toNumber(currentItem.unitPrice);
        const nextPrice = toNumber(nextItem.price);

        if (!canEditItems && nextQty > currentQty && currentItem.productId) {
          await request<{ order: BackendOrder }>(`/orders/${id}/items`, {
            method: 'POST',
            body: JSON.stringify({
              productId: currentItem.productId,
              quantity: nextQty - currentQty
            })
          });
          continue;
        }

        if (canEditItems && (currentQty !== nextQty || Math.abs(currentPrice - nextPrice) > 0.0001)) {
          await request<{ order: BackendOrder }>(`/orders/${id}/items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              quantity: nextQty,
              unitPrice: nextPrice
            })
          });
        }
      }

      const newItems = items.filter((item) => !currentItemsMap.has(item.id));
      for (const item of newItems) {
        if (!item.productId) {
          continue;
        }

        const quantity = Math.max(1, Math.trunc(item.quantity || 1));
        await request<{ order: BackendOrder }>(`/orders/${id}/items`, {
          method: 'POST',
          body: JSON.stringify({
            productId: item.productId,
            quantity
          })
        });
      }

      const finalOrder = await request<BackendOrder>(`/orders/${id}`);
      return mapOrder(finalOrder);
    },

    close: async (
    id: string,
    paymentType: string,
    amount: number)
    : Promise<Order> => {
      const normalizedPaymentType: PaymentType =
      paymentType === 'cash' || paymentType === 'card' || paymentType === 'transfer' ?
      paymentType :
      'cash';

      const result = await request<{
        order: BackendOrder;
      }>(`/orders/${id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: toBackendPaymentMethod(normalizedPaymentType),
          paidAmount: amount
        })
      });

      return mapOrder(result.order);
    }
  },

  dashboard: {
    getStats: async (_branchId: string): Promise<DashboardStats> => {
      const from = shiftDate(-6);
      const to = todayStr();
      const query = buildQuery({ from, to });

      const [dashboard, salesSummary, openOrders, expenses] = await Promise.all([
      request<BackendDashboardPayload>('/reports/dashboard'),
      request<BackendSalesSummaryPayload>(`/reports/sales-summary${query}`),
      request<BackendOrder[]>('/orders/open'),
      request<BackendExpense[]>(`/expenses${query}`)]
      );

      const salesByDay = new Map(
        salesSummary.byDay.map((day) => [day.date, day])
      );

      const expenseByDay = new Map<string, number>();
      const expensesByTypeTotals: Record<ExpenseType, number> = {
        salary: 0,
        market: 0,
        other: 0
      };

      for (const rawExpense of expenses) {
        const expense = mapExpense(rawExpense);
        expenseByDay.set(expense.date, (expenseByDay.get(expense.date) ?? 0) + expense.amount);
        expensesByTypeTotals[expense.type] += expense.amount;
      }

      const revenueChart: DashboardStats['revenueChart'] = [];
      const ordersChart: DashboardStats['ordersChart'] = [];

      for (let i = 6; i >= 0; i -= 1) {
        const date = shiftDate(-i);
        const sales = salesByDay.get(date);
        const expenseAmount = expenseByDay.get(date) ?? 0;

        revenueChart.push({
          date: date.slice(5),
          tushum: sales?.totalAmount ?? 0,
          rashod: expenseAmount,
          xarajat: expenseAmount
        });

        ordersChart.push({
          date: date.slice(5),
          soni: sales?.ordersCount ?? 0
        });
      }

      const todayRevenue = toNumber(dashboard.stats.finance.salesTotal);
      const todayExpenses = toNumber(dashboard.stats.finance.expenseTotal);

      return {
        todayRevenue,
        todayExpenses,
        todayProfit: todayRevenue - todayExpenses,
        openOrdersCount: dashboard.stats.orders.openCount,
        revenueChart,
        expensesByType: [
        {
          name: 'Ish haqi',
          value: expensesByTypeTotals.salary
        },
        {
          name: 'Bozor xarajati',
          value: expensesByTypeTotals.market
        },
        {
          name: 'Boshqa xarajat',
          value: expensesByTypeTotals.other
        }],

        ordersChart,
        openOrders: openOrders.map(mapOrder)
      };
    }
  },

  me: {
    tables: async (): Promise<TableItem[]> => {
      const rows = await request<BackendTable[]>("/me/tables");
      return rows.filter((table) => table.status !== "DISABLED").map(mapTable);
    },

    categories: async (): Promise<Category[]> => {
      const rows = await request<BackendCategory[]>("/me/categories");
      return rows.map(mapCategory);
    },

    products: async (): Promise<Product[]> => {
      const rows = await request<BackendProduct[]>("/me/products");
      return rows.map(mapProduct).filter((product) => product.isActive);
    },

    earnings: async (date?: string) => {
      const query = buildQuery({ date });
      const payload = await request<BackendMeEarningsPayload>(`/me/earnings${query}`);

      return {
        waiter: {
          id: payload.waiter.id,
          fullName: payload.waiter.fullName,
          salesSharePercent: toNumber(payload.waiter.salesSharePercent, 8)
        },
        baseDate: payload.baseDate,
        day: {
          from: payload.day.from,
          to: payload.day.to,
          closedOrdersCount: payload.day.closedOrdersCount,
          salesTotal: toNumber(payload.day.salesTotal),
          commissionTotal: toNumber(payload.day.commissionTotal)
        },
        month: {
          from: payload.month.from,
          to: payload.month.to,
          closedOrdersCount: payload.month.closedOrdersCount,
          salesTotal: toNumber(payload.month.salesTotal),
          commissionTotal: toNumber(payload.month.commissionTotal)
        },
        year: {
          from: payload.year.from,
          to: payload.year.to,
          closedOrdersCount: payload.year.closedOrdersCount,
          salesTotal: toNumber(payload.year.salesTotal),
          commissionTotal: toNumber(payload.year.commissionTotal)
        },
        shifts: payload.shifts.map((shift) => ({
          id: shift.id,
          status: shift.status,
          openedAt: shift.openedAt,
          closedAt: shift.closedAt
        })),
        shiftSummary: payload.shiftSummary
      };
    }
  },

  reports: {
    daily: async (_branchId: string, date: string) => {
      const range = getDayRange(date);
      const query = buildQuery(range);

      const [summary, expenses, closedOrders] = await Promise.all([
      request<BackendSalesSummaryPayload>(`/reports/sales-summary${query}`),
      request<BackendExpense[]>(`/expenses${query}`),
      request<BackendOrder[]>(`/orders${buildQuery({
        status: 'CLOSED',
        ...range
      })}`)]
      );

      const revenue = toNumber(summary.summary.totalAmount);

      let salary = 0;
      let market = 0;
      let other = 0;

      for (const rawExpense of expenses) {
        const expense = mapExpense(rawExpense);
        if (expense.type === 'salary') salary += expense.amount;
        if (expense.type === 'market') market += expense.amount;
        if (expense.type === 'other') other += expense.amount;
      }

      const expensesTotal = salary + market + other;

      let cash = 0;
      let card = 0;
      let transfer = 0;

      for (const order of closedOrders) {
        const amount = toNumber(order.totalAmount);
        if (order.paymentMethod === 'CASH') cash += amount;
        if (order.paymentMethod === 'CARD') card += amount;
        if (order.paymentMethod === 'TRANSFER') transfer += amount;
      }

      return {
        revenue,
        expenses: expensesTotal,
        profit: revenue - expensesTotal,
        cash,
        card,
        transfer,
        salary,
        market,
        other
      };
    },

    monthly: async (_branchId: string, from: string, to: string) => {
      const query = buildQuery({ from, to });

      const [summary, expenses] = await Promise.all([
      request<BackendSalesSummaryPayload>(`/reports/sales-summary${query}`),
      request<BackendExpense[]>(`/expenses${query}`)]
      );

      const salesByDay = new Map(summary.byDay.map((day) => [day.date, day.totalAmount]));
      const expenseByDay = new Map<string, number>();

      for (const rawExpense of expenses) {
        const expense = mapExpense(rawExpense);
        expenseByDay.set(expense.date, (expenseByDay.get(expense.date) ?? 0) + expense.amount);
      }

      const days: {
        date: string;
        tushum: number;
        xarajat: number;
        foyda: number;
      }[] = [];

      const cursor = new Date(`${from}T00:00:00.000`);
      const end = new Date(`${to}T00:00:00.000`);

      while (cursor.getTime() <= end.getTime()) {
        const date = toLocalDateKey(cursor);
        const tushum = salesByDay.get(date) ?? 0;
        const xarajat = expenseByDay.get(date) ?? 0;

        days.push({
          date,
          tushum,
          xarajat,
          foyda: tushum - xarajat
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      return {
        days,
        totals: {
          tushum: days.reduce((sum, day) => sum + day.tushum, 0),
          xarajat: days.reduce((sum, day) => sum + day.xarajat, 0),
          foyda: days.reduce((sum, day) => sum + day.foyda, 0)
        }
      };
    },

    waiterActivity: async (
    _branchId: string,
    from: string,
    to: string)
    : Promise<WaiterActivity[]> => {
      const query = buildQuery({ from, to });
      const payload = await request<BackendWaiterActivityPayload>(`/reports/waiter-activity${query}`);

      return payload.data.map((row) => {
        const revenue = toNumber(row.salesTotal);
        const closedOrders = row.closedOrdersCount;

        return {
          waiterId: row.waiterId,
          waiterName: row.fullName,
          openedOrders: row.openOrdersCount + row.closedOrdersCount,
          closedOrders,
          revenue,
          sharePercent: toNumber(row.salesSharePercent, 8),
          shareAmount: toNumber(row.shareAmount),
          avgCheck: closedOrders > 0 ? Math.round(revenue / closedOrders) : 0,
          itemsAdded: row.itemsCount
        };
      });
    }
  }
};
