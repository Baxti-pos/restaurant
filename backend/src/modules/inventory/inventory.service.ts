import { InventoryUnit, Prisma, StockMovementType } from '@prisma/client';
import { prisma } from '../../prisma.js';

type TxClient = Prisma.TransactionClient;
type DecimalLike = Prisma.Decimal | string | number | null | undefined;

interface InventoryActor {
  userId?: string | null;
}

interface ParsedDateRange {
  from: Date;
  to: Date;
}

const ingredientSelect = {
  id: true,
  branchId: true,
  name: true,
  unit: true,
  minQty: true,
  currentQty: true,
  avgUnitCost: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

type IngredientRow = Prisma.IngredientGetPayload<{ select: typeof ingredientSelect }>;

const productRecipeSelect = {
  id: true,
  branchId: true,
  name: true,
  price: true,
  isActive: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  recipe: {
    select: {
      id: true,
      note: true,
      isActive: true,
      items: {
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          ingredientId: true,
          quantity: true,
          ingredient: {
            select: {
              id: true,
              name: true,
              unit: true,
              currentQty: true,
              avgUnitCost: true,
              isActive: true,
            },
          },
        },
      },
    },
  },
} as const;

type ProductRecipeRow = Prisma.ProductGetPayload<{ select: typeof productRecipeSelect }>;

export class InventoryError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'InventoryError';
  }
}

const zeroDecimal = () => new Prisma.Decimal(0);

const decimalFrom = (value: DecimalLike, fallback = zeroDecimal()) => {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? new Prisma.Decimal(value) : fallback;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    try {
      return new Prisma.Decimal(trimmed);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InventoryError(400, label + ' kiritilishi shart');
  }

  return value.trim();
};

const parseOptionalString = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InventoryError(400, 'Matn qiymati yaroqsiz');
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseBooleanField = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  throw new InventoryError(400, label + ' yaroqsiz');
};

const parseDecimalField = (
  value: unknown,
  label: string,
  options?: { required?: boolean; allowZero?: boolean }
) => {
  const required = options?.required ?? false;
  const allowZero = options?.allowZero ?? true;

  if (value === undefined) {
    if (required) {
      throw new InventoryError(400, label + ' kiritilishi shart');
    }
    return undefined;
  }

  const decimal = decimalFrom(value as DecimalLike, new Prisma.Decimal('NaN'));
  if (decimal.isNaN()) {
    throw new InventoryError(400, label + ' yaroqsiz');
  }

  if (decimal.lessThan(0)) {
    throw new InventoryError(400, label + ' manfiy bolishi mumkin emas');
  }

  if (!allowZero && decimal.equals(0)) {
    throw new InventoryError(400, label + ' 0 dan katta bolishi kerak');
  }

  return decimal;
};

const parseDateField = (value: unknown, label: 'from' | 'to' | 'purchasedAt') => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new InventoryError(400, label + ' sanasi yaroqsiz');
  }

  const trimmed = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(trimmed + 'T' + (label === 'to' ? '23:59:59.999' : '00:00:00.000'))
    : new Date(trimmed);

  if (Number.isNaN(normalized.getTime())) {
    throw new InventoryError(400, label + ' sanasi yaroqsiz');
  }

  return normalized;
};

const parseDateRange = (
  query: Record<string, unknown> | undefined,
  defaults: 'month' | 'today' = 'month'
): ParsedDateRange => {
  const now = new Date();
  const defaultFrom =
    defaults === 'today'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const defaultTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const from = parseDateField(query?.from, 'from') ?? defaultFrom;
  const to = parseDateField(query?.to, 'to') ?? defaultTo;

  if (from > to) {
    throw new InventoryError(400, 'from sanasi to sanasidan katta bolishi mumkin emas');
  }

  return { from, to };
};

const parseLimit = (value: unknown, fallback = 30) => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InventoryError(400, 'limit yaroqsiz');
  }

  return Math.min(parsed, 100);
};

const parseInventoryUnit = (value: unknown, label = 'Unit') => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InventoryError(400, label + ' tanlanishi shart');
  }

  const normalized = value.trim().toUpperCase();
  if (!Object.values(InventoryUnit).includes(normalized as InventoryUnit)) {
    throw new InventoryError(400, label + ' yaroqsiz');
  }

  return normalized as InventoryUnit;
};

const parseObject = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new InventoryError(400, "Sorov malumoti yaroqsiz");
  }

  return value as Record<string, unknown>;
};

const parseItemsArray = (value: unknown, label: string) => {
  if (!Array.isArray(value)) {
    throw new InventoryError(400, label + ' royxati yuborilishi shart');
  }

  return value as unknown[];
};

const ensureOwnedActiveBranch = async (ownerId: string, branchId: string) => {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      ownerId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!branch) {
    throw new InventoryError(404, 'Faol filial topilmadi');
  }

  return branch;
};

const serializeIngredient = (ingredient: IngredientRow) => {
  const inventoryValue = ingredient.currentQty.mul(ingredient.avgUnitCost);
  return {
    ...ingredient,
    inventoryValue,
    isLowStock: ingredient.currentQty.lessThanOrEqualTo(ingredient.minQty),
  };
};

const serializeProductRecipeSummary = (product: ProductRecipeRow) => {
  const recipeItems = product.recipe?.items ?? [];
  const tracked = Boolean(product.recipe?.isActive && recipeItems.length > 0);

  let theoreticalCost = zeroDecimal();
  let possibleQty: number | null = null;

  if (tracked) {
    for (const item of recipeItems) {
      theoreticalCost = theoreticalCost.plus(item.quantity.mul(item.ingredient.avgUnitCost));
      const currentPossible = item.quantity.equals(0)
        ? 0
        : item.ingredient.currentQty.div(item.quantity).floor().toNumber();
      possibleQty = possibleQty === null ? currentPossible : Math.min(possibleQty, currentPossible);
    }
  }

  return {
    id: product.id,
    branchId: product.branchId,
    name: product.name,
    price: product.price,
    isActive: product.isActive,
    category: product.category,
    tracked,
    theoreticalCost: tracked ? theoreticalCost : zeroDecimal(),
    possibleQty: tracked ? possibleQty ?? 0 : null,
    recipe: product.recipe
      ? {
          id: product.recipe.id,
          note: product.recipe.note,
          isActive: product.recipe.isActive,
          items: product.recipe.items.map((item) => ({
            id: item.id,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            ingredient: item.ingredient,
          })),
        }
      : null,
  };
};

const getIngredientMapTx = async (tx: TxClient, branchId: string, ingredientIds: string[]) => {
  const uniqueIds = Array.from(new Set(ingredientIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, IngredientRow>();
  }

  const ingredients = await tx.ingredient.findMany({
    where: {
      branchId,
      id: { in: uniqueIds },
    },
    select: ingredientSelect,
  });

  return new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
};

const getProductRecipeSummaryTx = async (tx: TxClient, branchId: string, productId: string) => {
  const product = await tx.product.findFirst({
    where: {
      id: productId,
      branchId,
    },
    select: productRecipeSelect,
  });

  if (!product) {
    throw new InventoryError(404, 'Mahsulot topilmadi');
  }

  return serializeProductRecipeSummary(product);
};

const createMovementTx = async (
  tx: TxClient,
  input: {
    branchId: string;
    ingredientId: string;
    createdById?: string | null;
    type: StockMovementType;
    quantityChange: Prisma.Decimal;
    quantityAfter: Prisma.Decimal;
    unitCost?: Prisma.Decimal | null;
    totalCost?: Prisma.Decimal | null;
    referenceType?: string | null;
    referenceId?: string | null;
    note?: string | null;
  }
) => {
  return tx.stockMovement.create({
    data: {
      branchId: input.branchId,
      ingredientId: input.ingredientId,
      createdById: input.createdById ?? null,
      type: input.type,
      quantityChange: input.quantityChange,
      quantityAfter: input.quantityAfter,
      unitCost: input.unitCost ?? null,
      totalCost: input.totalCost ?? null,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      note: input.note ?? null,
    },
  });
};

const mapInventoryKnownError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new InventoryError(409, 'Bunday nom bilan yozuv allaqachon mavjud');
  }

  return error;
};

export const inventoryService = {
  async dashboard(ownerId: string, branchId: string, query?: Record<string, unknown>) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const range = parseDateRange(query, 'month');

    const [ingredients, purchasesAgg, usageAgg, usageRows, products] = await Promise.all([
      prisma.ingredient.findMany({
        where: {
          branchId,
          isActive: true,
        },
        select: ingredientSelect,
        orderBy: [{ name: 'asc' }],
      }),
      prisma.inventoryPurchase.aggregate({
        where: {
          branchId,
          purchasedAt: {
            gte: range.from,
            lte: range.to,
          },
        },
        _sum: {
          totalAmount: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.stockMovement.aggregate({
        where: {
          branchId,
          type: StockMovementType.SALE_OUT,
          createdAt: {
            gte: range.from,
            lte: range.to,
          },
        },
        _sum: {
          totalCost: true,
        },
      }),
      prisma.stockMovement.groupBy({
        by: ['ingredientId'],
        where: {
          branchId,
          type: StockMovementType.SALE_OUT,
          createdAt: {
            gte: range.from,
            lte: range.to,
          },
        },
        _sum: {
          quantityChange: true,
          totalCost: true,
        },
      }),
      prisma.product.findMany({
        where: {
          branchId,
          isActive: true,
        },
        select: productRecipeSelect,
        orderBy: [{ name: 'asc' }],
      }),
    ]);

    const serializedIngredients = ingredients.map(serializeIngredient);
    const ingredientNameMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
    const inventoryValue = serializedIngredients.reduce(
      (sum, ingredient) => sum.plus(ingredient.inventoryValue),
      zeroDecimal()
    );
    const lowStock = serializedIngredients
      .filter((ingredient) => ingredient.isLowStock)
      .sort((a, b) => a.currentQty.minus(a.minQty).comparedTo(b.currentQty.minus(b.minQty)))
      .slice(0, 8);

    const usageData = usageRows
      .map((row) => {
        const ingredient = ingredientNameMap.get(row.ingredientId);
        if (!ingredient) {
          return null;
        }

        return {
          ingredientId: row.ingredientId,
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          usageQty: decimalFrom(row._sum.quantityChange).abs(),
          usageCost: decimalFrom(row._sum.totalCost).abs(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => b.usageCost.comparedTo(a.usageCost));

    const productCosts = products.map(serializeProductRecipeSummary);
    const canMakeNow = productCosts
      .filter((product) => product.tracked)
      .sort((a, b) => (a.possibleQty ?? 0) - (b.possibleQty ?? 0))
      .slice(0, 8);

    return {
      range,
      summary: {
        ingredientsCount: ingredients.length,
        trackedProductsCount: productCosts.filter((product) => product.tracked).length,
        lowStockCount: serializedIngredients.filter((ingredient) => ingredient.isLowStock).length,
        inventoryValue,
        purchaseTotal: decimalFrom(purchasesAgg._sum.totalAmount),
        purchaseCount: purchasesAgg._count._all,
        usageCostTotal: decimalFrom(usageAgg._sum.totalCost).abs(),
      },
      lowStock,
      canMakeNow,
      topUsage: usageData.slice(0, 8),
      productCosts: productCosts.slice(0, 8),
    };
  },

  async listIngredients(ownerId: string, branchId: string, query?: Record<string, unknown>) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    const search =
      typeof query?.search === 'string' && query.search.trim() ? query.search.trim() : undefined;

    const ingredients = await prisma.ingredient.findMany({
      where: {
        branchId,
        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      select: ingredientSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return ingredients.map(serializeIngredient);
  },

  async createIngredient(
    ownerId: string,
    branchId: string,
    payload: unknown,
    actor?: InventoryActor
  ) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const body = parseObject(payload);

    const name = parseRequiredString(body.name, 'Ingredient nomi');
    const unit = parseInventoryUnit(body.unit, 'Unit');
    const minQty = parseDecimalField(body.minQty, 'Minimal qoldiq') ?? zeroDecimal();
    const currentQty = parseDecimalField(body.currentQty, 'Joriy qoldiq') ?? zeroDecimal();
    const avgUnitCost = parseDecimalField(body.avgUnitCost, 'Birlik tannarxi') ?? zeroDecimal();
    const isActive = parseBooleanField(body.isActive, 'Holat') ?? true;
    const note = parseOptionalString(body.note);

    try {
      return await prisma.$transaction(async (tx) => {
        const created = await tx.ingredient.create({
          data: {
            branchId,
            name,
            unit,
            minQty,
            currentQty,
            avgUnitCost,
            isActive,
          },
          select: ingredientSelect,
        });

        if (currentQty.greaterThan(0)) {
          await createMovementTx(tx, {
            branchId,
            ingredientId: created.id,
            createdById: actor?.userId ?? null,
            type: StockMovementType.INITIAL_IN,
            quantityChange: currentQty,
            quantityAfter: currentQty,
            unitCost: avgUnitCost,
            totalCost: currentQty.mul(avgUnitCost),
            referenceType: 'INGREDIENT',
            referenceId: created.id,
            note: note ?? 'Boshlangich qoldiq',
          });
        }

        return serializeIngredient(created);
      });
    } catch (error) {
      throw mapInventoryKnownError(error);
    }
  },

  async updateIngredient(
    ownerId: string,
    branchId: string,
    ingredientIdRaw: unknown,
    payload: unknown,
    actor?: InventoryActor
  ) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const ingredientId = parseRequiredString(ingredientIdRaw, 'Ingredient ID');
    const body = parseObject(payload);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.ingredient.findFirst({
        where: {
          id: ingredientId,
          branchId,
        },
        select: ingredientSelect,
      });

      if (!existing) {
        throw new InventoryError(404, 'Ingredient topilmadi');
      }

      const nextName =
        Object.prototype.hasOwnProperty.call(body, 'name')
          ? parseRequiredString(body.name, 'Ingredient nomi')
          : existing.name;
      const nextMinQty =
        Object.prototype.hasOwnProperty.call(body, 'minQty')
          ? parseDecimalField(body.minQty, 'Minimal qoldiq') ?? zeroDecimal()
          : existing.minQty;
      const nextIsActive =
        Object.prototype.hasOwnProperty.call(body, 'isActive')
          ? parseBooleanField(body.isActive, 'Holat') ?? existing.isActive
          : existing.isActive;
      const nextAvgUnitCost =
        Object.prototype.hasOwnProperty.call(body, 'avgUnitCost')
          ? parseDecimalField(body.avgUnitCost, 'Birlik tannarxi') ?? zeroDecimal()
          : existing.avgUnitCost;
      const requestedUnit =
        Object.prototype.hasOwnProperty.call(body, 'unit')
          ? parseInventoryUnit(body.unit, 'Unit')
          : existing.unit;
      const nextCurrentQty =
        Object.prototype.hasOwnProperty.call(body, 'currentQty')
          ? parseDecimalField(body.currentQty, 'Joriy qoldiq') ?? zeroDecimal()
          : existing.currentQty;
      const adjustmentNote = parseOptionalString(body.adjustmentNote);

      if (requestedUnit !== existing.unit) {
        const movementsCount = await tx.stockMovement.count({
          where: {
            ingredientId: existing.id,
          },
        });

        if (movementsCount > 0) {
          throw new InventoryError(409, 'Harakatlari bor ingredientning unitini ozgartirib bolmaydi');
        }
      }

      const updated = await tx.ingredient.update({
        where: { id: existing.id },
        data: {
          name: nextName,
          minQty: nextMinQty,
          currentQty: nextCurrentQty,
          avgUnitCost: nextAvgUnitCost,
          isActive: nextIsActive,
          unit: requestedUnit,
        },
        select: ingredientSelect,
      });

      const diff = nextCurrentQty.minus(existing.currentQty);
      if (!diff.equals(0)) {
        await createMovementTx(tx, {
          branchId,
          ingredientId: existing.id,
          createdById: actor?.userId ?? null,
          type: diff.greaterThan(0) ? StockMovementType.ADJUSTMENT_IN : StockMovementType.ADJUSTMENT_OUT,
          quantityChange: diff,
          quantityAfter: nextCurrentQty,
          unitCost: nextAvgUnitCost,
          totalCost: diff.abs().mul(nextAvgUnitCost),
          referenceType: 'INGREDIENT_ADJUSTMENT',
          referenceId: existing.id,
          note: adjustmentNote ?? 'Qoldiq tuzatildi',
        });
      }

      return serializeIngredient(updated);
    });
  },

  async listPurchases(ownerId: string, branchId: string, query?: Record<string, unknown>) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const range = parseDateRange(query, 'month');
    const limit = parseLimit(query?.limit, 30);

    return prisma.inventoryPurchase.findMany({
      where: {
        branchId,
        purchasedAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        branchId: true,
        supplierName: true,
        note: true,
        totalAmount: true,
        purchasedAt: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        items: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            quantity: true,
            unitCost: true,
            totalCost: true,
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });
  },

  async createPurchase(
    ownerId: string,
    branchId: string,
    payload: unknown,
    actor?: InventoryActor
  ) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const body = parseObject(payload);

    const supplierName = parseOptionalString(body.supplierName);
    const note = parseOptionalString(body.note);
    const purchasedAt = parseDateField(body.purchasedAt, 'purchasedAt') ?? new Date();
    const rawItems = parseItemsArray(body.items, 'Kirim itemlari');

    if (rawItems.length === 0) {
      throw new InventoryError(400, 'Kamida bitta kirim itemi bolishi kerak');
    }

    const items = rawItems.map((raw, index) => {
      const item = parseObject(raw);
      return {
        ingredientId: parseRequiredString(item.ingredientId, String(index + 1) + '-ingredient ID'),
        quantity: parseDecimalField(item.quantity, String(index + 1) + '-quantity', {
          required: true,
          allowZero: false,
        })!,
        unitCost: parseDecimalField(item.unitCost, String(index + 1) + '-unitCost', {
          required: true,
        })!,
      };
    });

    const ingredientIds = items.map((item) => item.ingredientId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      throw new InventoryError(400, 'Bitta ingredientni kirimda ikki marta yuborib bolmaydi');
    }

    return prisma.$transaction(async (tx) => {
      const ingredientMap = await getIngredientMapTx(tx, branchId, ingredientIds);
      for (const ingredientId of ingredientIds) {
        const ingredient = ingredientMap.get(ingredientId);
        if (!ingredient || !ingredient.isActive) {
          throw new InventoryError(404, 'Kirim uchun yaroqli ingredient topilmadi');
        }
      }

      const purchase = await tx.inventoryPurchase.create({
        data: {
          branchId,
          createdById: actor?.userId ?? null,
          supplierName: supplierName ?? null,
          note: note ?? null,
          purchasedAt,
        },
        select: {
          id: true,
        },
      });

      let totalAmount = zeroDecimal();
      const nextStateMap = new Map<string, { currentQty: Prisma.Decimal; avgUnitCost: Prisma.Decimal }>();

      for (const item of items) {
        const ingredient = ingredientMap.get(item.ingredientId)!;
        const previous = nextStateMap.get(ingredient.id) ?? {
          currentQty: ingredient.currentQty,
          avgUnitCost: ingredient.avgUnitCost,
        };

        const totalCost = item.quantity.mul(item.unitCost);
        const nextQty = previous.currentQty.plus(item.quantity);
        const costBasis = previous.currentQty.mul(previous.avgUnitCost).plus(totalCost);
        const nextAvgCost = nextQty.equals(0) ? zeroDecimal() : costBasis.div(nextQty);

        await tx.inventoryPurchaseItem.create({
          data: {
            purchaseId: purchase.id,
            ingredientId: ingredient.id,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost,
          },
        });

        await tx.ingredient.update({
          where: { id: ingredient.id },
          data: {
            currentQty: nextQty,
            avgUnitCost: nextAvgCost,
          },
        });

        await createMovementTx(tx, {
          branchId,
          ingredientId: ingredient.id,
          createdById: actor?.userId ?? null,
          type: StockMovementType.PURCHASE_IN,
          quantityChange: item.quantity,
          quantityAfter: nextQty,
          unitCost: item.unitCost,
          totalCost,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          note: supplierName ?? note ?? 'Inventar kirimi',
        });

        nextStateMap.set(ingredient.id, {
          currentQty: nextQty,
          avgUnitCost: nextAvgCost,
        });
        totalAmount = totalAmount.plus(totalCost);
      }

      await tx.inventoryPurchase.update({
        where: { id: purchase.id },
        data: {
          totalAmount,
        },
      });

      return tx.inventoryPurchase.findUniqueOrThrow({
        where: { id: purchase.id },
        select: {
          id: true,
          branchId: true,
          supplierName: true,
          note: true,
          totalAmount: true,
          purchasedAt: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
          items: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              quantity: true,
              unitCost: true,
              totalCost: true,
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
        },
      });
    });
  },

  async listMovements(ownerId: string, branchId: string, query?: Record<string, unknown>) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const range = parseDateRange(query, 'month');
    const limit = parseLimit(query?.limit, 50);
    const ingredientId =
      typeof query?.ingredientId === 'string' && query.ingredientId.trim()
        ? query.ingredientId.trim()
        : undefined;

    return prisma.stockMovement.findMany({
      where: {
        branchId,
        createdAt: {
          gte: range.from,
          lte: range.to,
        },
        ...(ingredientId ? { ingredientId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        type: true,
        quantityChange: true,
        quantityAfter: true,
        unitCost: true,
        totalCost: true,
        referenceType: true,
        referenceId: true,
        note: true,
        createdAt: true,
        ingredient: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });
  },

  async usage(ownerId: string, branchId: string, query?: Record<string, unknown>) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const range = parseDateRange(query, 'month');

    const rows = await prisma.stockMovement.groupBy({
      by: ['ingredientId'],
      where: {
        branchId,
        type: StockMovementType.SALE_OUT,
        createdAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      _sum: {
        quantityChange: true,
        totalCost: true,
      },
    });

    const ingredients = await prisma.ingredient.findMany({
      where: {
        id: {
          in: rows.map((row) => row.ingredientId),
        },
      },
      select: {
        id: true,
        name: true,
        unit: true,
      },
    });

    const ingredientMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

    const data = rows
      .map((row) => {
        const ingredient = ingredientMap.get(row.ingredientId);
        if (!ingredient) {
          return null;
        }

        return {
          ingredientId: row.ingredientId,
          ingredientName: ingredient.name,
          unit: ingredient.unit,
          usageQty: decimalFrom(row._sum.quantityChange).abs(),
          usageCost: decimalFrom(row._sum.totalCost).abs(),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => b.usageCost.comparedTo(a.usageCost));

    return {
      range,
      summary: {
        totalUsageCost: data.reduce((sum, item) => sum.plus(item.usageCost), zeroDecimal()),
        totalIngredients: data.length,
      },
      data,
    };
  },

  async listProducts(ownerId: string, branchId: string, query?: Record<string, unknown>) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const search =
      typeof query?.search === 'string' && query.search.trim() ? query.search.trim() : undefined;

    const products = await prisma.product.findMany({
      where: {
        branchId,
        isActive: true,
        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      select: productRecipeSelect,
      orderBy: [{ name: 'asc' }],
    });

    return products.map(serializeProductRecipeSummary);
  },

  async getProductRecipe(ownerId: string, branchId: string, productIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const productId = parseRequiredString(productIdRaw, 'Mahsulot ID');

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        branchId,
      },
      select: productRecipeSelect,
    });

    if (!product) {
      throw new InventoryError(404, 'Mahsulot topilmadi');
    }

    return serializeProductRecipeSummary(product);
  },

  async saveProductRecipe(
    ownerId: string,
    branchId: string,
    productIdRaw: unknown,
    payload: unknown
  ) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const productId = parseRequiredString(productIdRaw, 'Mahsulot ID');
    const body = parseObject(payload);
    const note = parseOptionalString(body.note);
    const rawItems = parseItemsArray(body.items, 'Retsept itemlari');

    const items = rawItems.map((raw, index) => {
      const item = parseObject(raw);
      return {
        ingredientId: parseRequiredString(item.ingredientId, String(index + 1) + '-ingredient ID'),
        quantity: parseDecimalField(item.quantity, String(index + 1) + '-quantity', {
          required: true,
          allowZero: false,
        })!,
      };
    });

    if (new Set(items.map((item) => item.ingredientId)).size !== items.length) {
      throw new InventoryError(400, 'Retseptda ingredient takrorlanmasligi kerak');
    }

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: {
          id: productId,
          branchId,
        },
        select: {
          id: true,
        },
      });

      if (!product) {
        throw new InventoryError(404, 'Mahsulot topilmadi');
      }

      const existingRecipe = await tx.productRecipe.findUnique({
        where: { productId },
        select: { id: true },
      });

      if (items.length > 0) {
        const ingredientMap = await getIngredientMapTx(
          tx,
          branchId,
          items.map((item) => item.ingredientId)
        );

        for (const item of items) {
          const ingredient = ingredientMap.get(item.ingredientId);
          if (!ingredient || !ingredient.isActive) {
            throw new InventoryError(404, 'Retsept uchun yaroqli ingredient topilmadi');
          }
        }
      }

      if (items.length === 0) {
        if (existingRecipe) {
          await tx.productRecipe.delete({
            where: { id: existingRecipe.id },
          });
        }

        return getProductRecipeSummaryTx(tx, branchId, productId);
      }

      const recipeId = existingRecipe?.id ?? (
        await tx.productRecipe.create({
          data: {
            branchId,
            productId,
            note: note ?? null,
            isActive: true,
          },
          select: { id: true },
        })
      ).id;

      if (existingRecipe) {
        await tx.productRecipe.update({
          where: { id: recipeId },
          data: {
            note: note ?? null,
            isActive: true,
          },
        });

        await tx.productRecipeItem.deleteMany({
          where: { recipeId },
        });
      }

      await tx.productRecipeItem.createMany({
        data: items.map((item) => ({
          recipeId,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
        })),
      });

      return getProductRecipeSummaryTx(tx, branchId, productId);
    });
  },
};

export const applyInventoryForClosedOrderTx = async (
  tx: TxClient,
  input: {
    branchId: string;
    orderId: string;
    totalAmount: Prisma.Decimal;
    actor?: InventoryActor;
  }
) => {
  const order = await tx.order.findFirst({
    where: {
      id: input.orderId,
      branchId: input.branchId,
    },
    select: {
      id: true,
      items: {
        select: {
          productId: true,
          productName: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    throw new InventoryError(404, 'Buyurtma topilmadi');
  }

  const productIds = Array.from(
    new Set(order.items.map((item) => item.productId).filter((value): value is string => Boolean(value)))
  );

  if (productIds.length === 0) {
    return {
      inventoryChanged: false,
      costAmount: zeroDecimal(),
      grossProfitAmount: input.totalAmount,
    };
  }

  const recipes = await tx.productRecipe.findMany({
    where: {
      branchId: input.branchId,
      productId: { in: productIds },
      isActive: true,
    },
    select: {
      productId: true,
      items: {
        select: {
          ingredientId: true,
          quantity: true,
          ingredient: {
            select: {
              id: true,
              name: true,
              currentQty: true,
              avgUnitCost: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  const recipeMap = new Map(recipes.map((recipe) => [recipe.productId, recipe]));
  const requiredByIngredient = new Map<
    string,
    {
      ingredientId: string;
      ingredientName: string;
      requiredQty: Prisma.Decimal;
      currentQty: Prisma.Decimal;
      avgUnitCost: Prisma.Decimal;
    }
  >();

  for (const item of order.items) {
    if (!item.productId) {
      continue;
    }

    const recipe = recipeMap.get(item.productId);
    if (!recipe || recipe.items.length === 0) {
      continue;
    }

    for (const recipeItem of recipe.items) {
      if (!recipeItem.ingredient.isActive) {
        throw new InventoryError(409, recipeItem.ingredient.name + ' nofaol ingredient bolgani uchun order yopilmadi');
      }

      const requiredQty = recipeItem.quantity.mul(new Prisma.Decimal(item.quantity));
      const existing = requiredByIngredient.get(recipeItem.ingredientId);
      if (existing) {
        existing.requiredQty = existing.requiredQty.plus(requiredQty);
        continue;
      }

      requiredByIngredient.set(recipeItem.ingredientId, {
        ingredientId: recipeItem.ingredientId,
        ingredientName: recipeItem.ingredient.name,
        requiredQty,
        currentQty: recipeItem.ingredient.currentQty,
        avgUnitCost: recipeItem.ingredient.avgUnitCost,
      });
    }
  }

  if (requiredByIngredient.size === 0) {
    return {
      inventoryChanged: false,
      costAmount: zeroDecimal(),
      grossProfitAmount: input.totalAmount,
    };
  }

  for (const row of requiredByIngredient.values()) {
    if (row.currentQty.lessThan(row.requiredQty)) {
      throw new InventoryError(409, row.ingredientName + ' qoldigi yetarli emas. Kerak: ' + row.requiredQty.toString());
    }
  }

  let totalCost = zeroDecimal();

  for (const row of requiredByIngredient.values()) {
    const nextQty = row.currentQty.minus(row.requiredQty);
    const movementCost = row.requiredQty.mul(row.avgUnitCost);

    await tx.ingredient.update({
      where: { id: row.ingredientId },
      data: {
        currentQty: nextQty,
      },
    });

    await createMovementTx(tx, {
      branchId: input.branchId,
      ingredientId: row.ingredientId,
      createdById: input.actor?.userId ?? null,
      type: StockMovementType.SALE_OUT,
      quantityChange: row.requiredQty.negated(),
      quantityAfter: nextQty,
      unitCost: row.avgUnitCost,
      totalCost: movementCost,
      referenceType: 'ORDER',
      referenceId: input.orderId,
      note: 'Order yopilganda deduct qilindi',
    });

    totalCost = totalCost.plus(movementCost);
  }

  return {
    inventoryChanged: true,
    costAmount: totalCost,
    grossProfitAmount: input.totalAmount.minus(totalCost),
  };
};
