export type Role = 'owner' | 'manager' | 'waiter';
export type TableStatus = 'empty' | 'occupied' | 'closing';
export type OrderStatus = 'open' | 'closed';
export type PaymentType = 'cash' | 'card' | 'transfer';
export type ShiftStatus = 'active' | 'ended' | 'not_started';
export type InventoryUnit = 'GRAM' | 'MILLILITER' | 'PIECE';
export type StockMovementType =
  | 'INITIAL_IN'
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
  permissions: string[];
}

export interface OwnerProfile {
  id: string;
  fullName: string;
  phone: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
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
  isEnabled: boolean;
  salesSharePercent: number;
  shiftStatus: ShiftStatus;
  createdAt: string;
}

export interface Manager {
  id: string;
  fullName: string;
  phone: string;
  permissions: string[];
  isActive: boolean;
  branches: {
    id: string;
    name: string;
    address: string;
    isActive: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface TableItem {
  id: string;
  branchId: string;
  name: string;
  status: TableStatus;
  currentOrderId?: string;
  currentOrderWaiterId?: string;
  currentOrderWaiterName?: string;
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
  note?: string;
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

export interface ExpenseCategory {
  id: string;
  branchId: string;
  name: string;
}

export interface Expense {
  id: string;
  branchId: string;
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
  };
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
  revenueChart: { date: string; tushum: number; rashod: number; xarajat?: number }[];
  expensesByType: { name: string; value: number }[];
  ordersChart: { date: string; soni: number }[];
  openOrders: Order[];
}

export interface WaiterActivity {
  waiterId: string;
  waiterName: string;
  openedOrders: number;
  closedOrders: number;
  revenue: number;
  sharePercent: number;
  shareAmount: number;
  avgCheck: number;
  itemsAdded: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  activeBranchId: string | null;
  branches: Branch[];
}

export interface WaiterShift {
  id: string;
  branchId: string;
  waiterId: string;
  openedById: string | null;
  closedById: string | null;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  openingNote: string | null;
  closingNote: string | null;
  startingCash: number;
  endingCash: number | null;
  openedBy?: { fullName: string };
  closedBy?: { fullName: string };
}

export interface CommissionPayout {
  id: string;
  branchId: string;
  waiterId: string;
  amount: number;
  note: string | null;
  paidAt: string;
  createdAt: string;
}

export interface WaiterCommissionSummary {
  waiterId: string;
  salesSharePercent: number;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  payouts: CommissionPayout[];
}

export interface Ingredient {
  id: string;
  branchId: string;
  name: string;
  unit: InventoryUnit;
  minQty: number;
  currentQty: number;
  avgUnitCost: number;
  inventoryValue: number;
  isLowStock: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryPurchaseItem {
  id: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  ingredient: {
    id: string;
    name: string;
    unit: InventoryUnit;
  };
}

export interface InventoryPurchase {
  id: string;
  branchId: string;
  supplierName: string | null;
  note: string | null;
  totalAmount: number;
  purchasedAt: string;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
  } | null;
  items: InventoryPurchaseItem[];
}

export interface StockMovement {
  id: string;
  type: StockMovementType;
  quantityChange: number;
  quantityAfter: number;
  unitCost: number | null;
  totalCost: number | null;
  referenceType: string | null;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
  ingredient: {
    id: string;
    name: string;
    unit: InventoryUnit;
  };
  createdBy: {
    id: string;
    fullName: string;
  } | null;
}

export interface IngredientUsage {
  ingredientId: string;
  ingredientName: string;
  unit: InventoryUnit;
  usageQty: number;
  usageCost: number;
}

export interface InventoryProductRecipeItem {
  id: string;
  ingredientId: string;
  quantity: number;
  ingredient: {
    id: string;
    name: string;
    unit: InventoryUnit;
    currentQty: number;
    avgUnitCost: number;
    isActive: boolean;
  };
}

export interface InventoryProductRecipe {
  id: string;
  note: string | null;
  isActive: boolean;
  items: InventoryProductRecipeItem[];
}

export interface InventoryProductSummary {
  id: string;
  branchId: string;
  name: string;
  price: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  } | null;
  tracked: boolean;
  theoreticalCost: number;
  possibleQty: number | null;
  recipe: InventoryProductRecipe | null;
}

export interface InventoryDashboard {
  range: {
    from: string;
    to: string;
  };
  summary: {
    ingredientsCount: number;
    trackedProductsCount: number;
    lowStockCount: number;
    inventoryValue: number;
    purchaseTotal: number;
    purchaseCount: number;
    usageCostTotal: number;
  };
  lowStock: Ingredient[];
  canMakeNow: InventoryProductSummary[];
  topUsage: IngredientUsage[];
  productCosts: InventoryProductSummary[];
}

export interface InventoryUsageReport {
  range: {
    from: string;
    to: string;
  };
  summary: {
    totalUsageCost: number;
    totalIngredients: number;
  };
  data: IngredientUsage[];
}
