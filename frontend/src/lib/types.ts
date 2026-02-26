export type Role = 'owner';
export type TableStatus = 'empty' | 'occupied' | 'closing';
export type OrderStatus = 'open' | 'closed';
export type PaymentType = 'cash' | 'card' | 'transfer';
export type ExpenseType = 'salary' | 'market' | 'other';
export type ShiftStatus = 'active' | 'ended' | 'not_started';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  shiftStart: string;
  shiftEnd: string;
  timezone: 'Asia/Tashkent';
  isActive: boolean;
}

export interface Waiter {
  id: string;
  branchId: string;
  name: string;
  phone: string;
  telegramId: string;
  isEnabled: boolean;
  shiftStatus: ShiftStatus;
  createdAt: string;
}

export interface TableItem {
  id: string;
  branchId: string;
  name: string;
  status: TableStatus;
  currentOrderId?: string;
}

export interface Category {
  id: string;
  branchId: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  branchId: string;
  tableId: string;
  tableName: string;
  waiterId: string;
  waiterName: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  paymentType?: PaymentType;
  createdAt: string;
  closedAt?: string;
}

export interface Expense {
  id: string;
  branchId: string;
  type: ExpenseType;
  name: string;
  amount: number;
  note?: string;
  date: string;
  createdAt: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todayExpenses: number;
  todayProfit: number;
  openOrdersCount: number;
  revenueChart: {date: string;tushum: number;rashod: number;}[];
  expensesByType: {name: string;value: number;}[];
  ordersChart: {date: string;soni: number;}[];
  openOrders: Order[];
}

export interface WaiterActivity {
  waiterId: string;
  waiterName: string;
  openedOrders: number;
  closedOrders: number;
  revenue: number;
  avgCheck: number;
  itemsAdded: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  activeBranchId: string | null;
}