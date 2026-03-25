import { getAuth } from './auth';
import {
  Ingredient,
  IngredientUsage,
  InventoryDashboard,
  InventoryProductSummary,
  InventoryPurchase,
  InventoryPurchaseItem,
  InventoryProductRecipe,
  InventoryProductRecipeItem,
  InventoryUsageReport,
  StockMovement,
  InventoryUnit,
  StockMovementType
} from './types';

interface BackendEnvelope<T> {
  message?: string;
  data?: T;
}

interface BackendIngredient {
  id: string;
  branchId: string;
  name: string;
  unit: InventoryUnit;
  minQty: string | number;
  currentQty: string | number;
  avgUnitCost: string | number;
  inventoryValue: string | number;
  isLowStock: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BackendInventoryPurchaseItem {
  id: string;
  quantity: string | number;
  unitCost: string | number;
  totalCost: string | number;
  ingredient: {
    id: string;
    name: string;
    unit: InventoryUnit;
  };
}

interface BackendInventoryPurchase {
  id: string;
  branchId: string;
  supplierName: string | null;
  note: string | null;
  totalAmount: string | number;
  purchasedAt: string;
  createdAt: string;
  createdBy: {
    id: string;
    fullName: string;
  } | null;
  items: BackendInventoryPurchaseItem[];
}

interface BackendIngredientUsage {
  ingredientId: string;
  ingredientName: string;
  unit: InventoryUnit;
  usageQty: string | number;
  usageCost: string | number;
}

interface BackendInventoryProductRecipeItem {
  id: string;
  ingredientId: string;
  quantity: string | number;
  ingredient: {
    id: string;
    name: string;
    unit: InventoryUnit;
    currentQty: string | number;
    avgUnitCost: string | number;
    isActive: boolean;
  };
}

interface BackendInventoryProductRecipe {
  id: string;
  note: string | null;
  isActive: boolean;
  items: BackendInventoryProductRecipeItem[];
}

interface BackendInventoryProductSummary {
  id: string;
  branchId: string;
  name: string;
  price: string | number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  } | null;
  tracked: boolean;
  theoreticalCost: string | number;
  possibleQty: number | null;
  recipe: BackendInventoryProductRecipe | null;
}

interface BackendInventoryDashboard {
  range: {
    from: string;
    to: string;
  };
  summary: {
    ingredientsCount: number;
    trackedProductsCount: number;
    lowStockCount: number;
    inventoryValue: string | number;
    purchaseTotal: string | number;
    purchaseCount: number;
    usageCostTotal: string | number;
  };
  lowStock: BackendIngredient[];
  canMakeNow: BackendInventoryProductSummary[];
  topUsage: BackendIngredientUsage[];
  productCosts: BackendInventoryProductSummary[];
}

interface BackendInventoryUsageReport {
  range: {
    from: string;
    to: string;
  };
  summary: {
    totalUsageCost: string | number;
    totalIngredients: number;
  };
  data: BackendIngredientUsage[];
}

interface BackendStockMovement {
  id: string;
  type: StockMovementType;
  quantityChange: string | number;
  quantityAfter: string | number;
  unitCost: string | number | null;
  totalCost: string | number | null;
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

const API_BASE_URL =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_API_BASE_URL ?? '/api';

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
    if (response.status === 401 && !options.skipAuth) {
      const { clearAuth } = await import('./auth');
      clearAuth();
      window.location.reload();
    }

    const message = extractErrorMessage(payload) ?? `So'rov bajarilmadi (${response.status})`;
    throw new Error(message);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as BackendEnvelope<T>).data as T;
  }

  return payload as T;
};

const mapIngredient = (row: BackendIngredient): Ingredient => ({
  id: row.id,
  branchId: row.branchId,
  name: row.name,
  unit: row.unit,
  minQty: toNumber(row.minQty),
  currentQty: toNumber(row.currentQty),
  avgUnitCost: toNumber(row.avgUnitCost),
  inventoryValue: toNumber(row.inventoryValue),
  isLowStock: row.isLowStock,
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const mapUsage = (row: BackendIngredientUsage): IngredientUsage => ({
  ingredientId: row.ingredientId,
  ingredientName: row.ingredientName,
  unit: row.unit,
  usageQty: toNumber(row.usageQty),
  usageCost: toNumber(row.usageCost)
});

const mapRecipeItem = (row: BackendInventoryProductRecipeItem): InventoryProductRecipeItem => ({
  id: row.id,
  ingredientId: row.ingredientId,
  quantity: toNumber(row.quantity),
  ingredient: {
    id: row.ingredient.id,
    name: row.ingredient.name,
    unit: row.ingredient.unit,
    currentQty: toNumber(row.ingredient.currentQty),
    avgUnitCost: toNumber(row.ingredient.avgUnitCost),
    isActive: row.ingredient.isActive
  }
});

const mapRecipe = (row: BackendInventoryProductRecipe): InventoryProductRecipe => ({
  id: row.id,
  note: row.note,
  isActive: row.isActive,
  items: row.items.map(mapRecipeItem)
});

const mapProductSummary = (row: BackendInventoryProductSummary): InventoryProductSummary => ({
  id: row.id,
  branchId: row.branchId,
  name: row.name,
  price: toNumber(row.price),
  isActive: row.isActive,
  category: row.category,
  tracked: row.tracked,
  theoreticalCost: toNumber(row.theoreticalCost),
  possibleQty: row.possibleQty,
  recipe: row.recipe ? mapRecipe(row.recipe) : null
});

const mapPurchaseItem = (row: BackendInventoryPurchaseItem): InventoryPurchaseItem => ({
  id: row.id,
  quantity: toNumber(row.quantity),
  unitCost: toNumber(row.unitCost),
  totalCost: toNumber(row.totalCost),
  ingredient: row.ingredient
});

const mapPurchase = (row: BackendInventoryPurchase): InventoryPurchase => ({
  id: row.id,
  branchId: row.branchId,
  supplierName: row.supplierName,
  note: row.note,
  totalAmount: toNumber(row.totalAmount),
  purchasedAt: row.purchasedAt,
  createdAt: row.createdAt,
  createdBy: row.createdBy,
  items: row.items.map(mapPurchaseItem)
});

const mapMovement = (row: BackendStockMovement): StockMovement => ({
  id: row.id,
  type: row.type,
  quantityChange: toNumber(row.quantityChange),
  quantityAfter: toNumber(row.quantityAfter),
  unitCost: row.unitCost === null ? null : toNumber(row.unitCost),
  totalCost: row.totalCost === null ? null : toNumber(row.totalCost),
  referenceType: row.referenceType,
  referenceId: row.referenceId,
  note: row.note,
  createdAt: row.createdAt,
  ingredient: row.ingredient,
  createdBy: row.createdBy
});

export const inventoryApi = {
  dashboard: async (from?: string, to?: string): Promise<InventoryDashboard> => {
    const query = buildQuery({ from, to });
    const payload = await request<BackendInventoryDashboard>(`/inventory/dashboard${query}`);
    return {
      range: payload.range,
      summary: {
        ingredientsCount: payload.summary.ingredientsCount,
        trackedProductsCount: payload.summary.trackedProductsCount,
        lowStockCount: payload.summary.lowStockCount,
        inventoryValue: toNumber(payload.summary.inventoryValue),
        purchaseTotal: toNumber(payload.summary.purchaseTotal),
        purchaseCount: payload.summary.purchaseCount,
        usageCostTotal: toNumber(payload.summary.usageCostTotal)
      },
      lowStock: payload.lowStock.map(mapIngredient),
      canMakeNow: payload.canMakeNow.map(mapProductSummary),
      topUsage: payload.topUsage.map(mapUsage),
      productCosts: payload.productCosts.map(mapProductSummary)
    };
  },

  listIngredients: async (search?: string): Promise<Ingredient[]> => {
    const query = buildQuery({ search });
    const rows = await request<BackendIngredient[]>(`/inventory/ingredients${query}`);
    return rows.map(mapIngredient);
  },

  createIngredient: async (payload: {
    name: string;
    unit: InventoryUnit;
    minQty?: number;
    currentQty?: number;
    avgUnitCost?: number;
    isActive?: boolean;
    note?: string;
  }): Promise<Ingredient> => {
    const row = await request<BackendIngredient>('/inventory/ingredients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return mapIngredient(row);
  },

  updateIngredient: async (
    ingredientId: string,
    payload: {
      name?: string;
      unit?: InventoryUnit;
      minQty?: number;
      currentQty?: number;
      avgUnitCost?: number;
      isActive?: boolean;
      adjustmentNote?: string;
    }
  ): Promise<Ingredient> => {
    const row = await request<BackendIngredient>(`/inventory/ingredients/${ingredientId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    return mapIngredient(row);
  },

  listPurchases: async (from?: string, to?: string, limit = 30): Promise<InventoryPurchase[]> => {
    const query = buildQuery({ from, to, limit: String(limit) });
    const rows = await request<BackendInventoryPurchase[]>(`/inventory/purchases${query}`);
    return rows.map(mapPurchase);
  },

  createPurchase: async (payload: {
    supplierName?: string;
    note?: string;
    purchasedAt?: string;
    items: Array<{
      ingredientId: string;
      quantity: number;
      unitCost: number;
    }>;
  }): Promise<InventoryPurchase> => {
    const row = await request<BackendInventoryPurchase>('/inventory/purchases', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return mapPurchase(row);
  },

  listMovements: async (
    from?: string,
    to?: string,
    ingredientId?: string,
    limit = 50
  ): Promise<StockMovement[]> => {
    const query = buildQuery({ from, to, ingredientId, limit: String(limit) });
    const rows = await request<BackendStockMovement[]>(`/inventory/movements${query}`);
    return rows.map(mapMovement);
  },

  usage: async (from?: string, to?: string): Promise<InventoryUsageReport> => {
    const query = buildQuery({ from, to });
    const payload = await request<BackendInventoryUsageReport>(`/inventory/usage${query}`);
    return {
      range: payload.range,
      summary: {
        totalUsageCost: toNumber(payload.summary.totalUsageCost),
        totalIngredients: payload.summary.totalIngredients
      },
      data: payload.data.map(mapUsage)
    };
  },

  listProducts: async (search?: string): Promise<InventoryProductSummary[]> => {
    const query = buildQuery({ search });
    const rows = await request<BackendInventoryProductSummary[]>(`/inventory/products${query}`);
    return rows.map(mapProductSummary);
  },

  getProductRecipe: async (productId: string): Promise<InventoryProductSummary> => {
    const row = await request<BackendInventoryProductSummary>(`/inventory/products/${productId}/recipe`);
    return mapProductSummary(row);
  },

  saveProductRecipe: async (
    productId: string,
    payload: {
      note?: string;
      items: Array<{
        ingredientId: string;
        quantity: number;
      }>;
    }
  ): Promise<InventoryProductSummary> => {
    const row = await request<BackendInventoryProductSummary>(`/inventory/products/${productId}/recipe`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return mapProductSummary(row);
  }
};
