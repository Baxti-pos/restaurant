import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

export class ProductsError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ProductsError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ProductsError(400, `${label} kiritilishi shart`);
  }

  return value.trim();
};

const parseNullableStringField = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ProductsError(400, `${label} yaroqsiz`);
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseBooleanField = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ProductsError(400, `${label} yaroqsiz`);
  }

  return value;
};

const parseIntField = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ProductsError(400, `${label} butun son bo'lishi kerak`);
  }

  return value;
};

const parseDecimalField = (
  value: unknown,
  label: string,
  options?: { required?: boolean; nullable?: boolean }
) => {
  const required = options?.required ?? false;
  const nullable = options?.nullable ?? false;

  if (value === undefined) {
    if (required) {
      throw new ProductsError(400, `${label} kiritilishi shart`);
    }
    return undefined;
  }

  if (value === null) {
    if (nullable) {
      return null;
    }

    if (required) {
      throw new ProductsError(400, `${label} kiritilishi shart`);
    }

    return undefined;
  }

  let normalized: string;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ProductsError(400, `${label} yaroqsiz`);
    }
    normalized = String(value);
  } else if (typeof value === "string") {
    normalized = value.trim();
    if (!normalized) {
      if (nullable) {
        return null;
      }
      throw new ProductsError(400, `${label} yaroqsiz`);
    }
  } else {
    throw new ProductsError(400, `${label} yaroqsiz`);
  }

  let decimal: Prisma.Decimal;
  try {
    decimal = new Prisma.Decimal(normalized);
  } catch {
    throw new ProductsError(400, `${label} yaroqsiz`);
  }

  if (decimal.isNegative()) {
    throw new ProductsError(400, `${label} manfiy bo'lishi mumkin emas`);
  }

  return decimal;
};

const mapPrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new ProductsError(409, "Mahsulot nomi yoki SKU allaqachon mavjud");
    }
  }

  return error;
};

const ensureOwnedActiveBranch = async (ownerId: string, branchId: string) => {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      ownerId,
      isActive: true
    },
    select: { id: true }
  });

  if (!branch) {
    throw new ProductsError(404, "Faol filial topilmadi");
  }
};

const ensureCategoryInBranch = async (branchId: string, categoryId: string) => {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      branchId
    },
    select: {
      id: true,
      name: true,
      isActive: true
    }
  });

  if (!category) {
    throw new ProductsError(404, "Kategoriya topilmadi");
  }

  return category;
};

const productSelect = {
  id: true,
  branchId: true,
  categoryId: true,
  name: true,
  sku: true,
  price: true,
  cost: true,
  portionLabel: true,
  imageUrl: true,
  description: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      isActive: true
    }
  }
} as const;

export const productsService = {
  async list(ownerId: string, branchId: string) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    return prisma.product.findMany({
      where: { branchId },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { createdAt: "asc" }
      ],
      select: productSelect
    });
  },

  async getById(ownerId: string, branchId: string, productIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const productId = parseRequiredString(productIdRaw, "Mahsulot ID");

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        branchId
      },
      select: productSelect
    });

    if (!product) {
      throw new ProductsError(404, "Mahsulot topilmadi");
    }

    return product;
  },

  async create(ownerId: string, branchId: string, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new ProductsError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const name = parseRequiredString(payload.name, "Mahsulot nomi");
    const categoryId = parseRequiredString(payload.categoryId, "Kategoriya ID");
    const sku = parseNullableStringField(payload.sku, "SKU");
    const price = parseDecimalField(payload.price, "Narx", { required: true });
    const cost = parseDecimalField(payload.cost, "Tannarx", { nullable: true });
    const portionLabel = parseNullableStringField(payload.portionLabel, "Porsiya");
    const imageUrl = parseNullableStringField(payload.imageUrl, "Rasm URL");
    const description = parseNullableStringField(payload.description, "Tavsif");
    const isActive = parseBooleanField(payload.isActive, "isActive");
    const sortOrder = parseIntField(payload.sortOrder, "sortOrder");

    await ensureCategoryInBranch(branchId, categoryId);

    try {
      return await prisma.product.create({
        data: {
          branchId,
          categoryId,
          name,
          sku: sku ?? null,
          price: price!,
          cost: cost ?? null,
          portionLabel: portionLabel ?? null,
          imageUrl: imageUrl ?? null,
          description: description ?? null,
          ...(isActive !== undefined ? { isActive } : {}),
          ...(sortOrder !== undefined ? { sortOrder } : {})
        },
        select: productSelect
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async update(ownerId: string, branchId: string, productIdRaw: unknown, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new ProductsError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const productId = parseRequiredString(productIdRaw, "Mahsulot ID");

    const existing = await prisma.product.findFirst({
      where: {
        id: productId,
        branchId
      },
      select: {
        id: true,
        categoryId: true
      }
    });

    if (!existing) {
      throw new ProductsError(404, "Mahsulot topilmadi");
    }

    const data: Prisma.ProductUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(payload, "name")) {
      data.name = parseRequiredString(payload.name, "Mahsulot nomi");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "categoryId")) {
      const categoryId = parseRequiredString(payload.categoryId, "Kategoriya ID");
      await ensureCategoryInBranch(branchId, categoryId);
      data.category = { connect: { id: categoryId } };
    }

    if (Object.prototype.hasOwnProperty.call(payload, "sku")) {
      const sku = parseNullableStringField(payload.sku, "SKU");
      data.sku = sku;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "price")) {
      const price = parseDecimalField(payload.price, "Narx");
      if (!price || price === null) {
        throw new ProductsError(400, "Narx yaroqsiz");
      }
      data.price = price;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "cost")) {
      data.cost = parseDecimalField(payload.cost, "Tannarx", { nullable: true }) ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "portionLabel")) {
      data.portionLabel = parseNullableStringField(payload.portionLabel, "Porsiya");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "imageUrl")) {
      data.imageUrl = parseNullableStringField(payload.imageUrl, "Rasm URL");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "description")) {
      data.description = parseNullableStringField(payload.description, "Tavsif");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "isActive")) {
      const isActive = parseBooleanField(payload.isActive, "isActive");
      if (isActive !== undefined) {
        data.isActive = isActive;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "sortOrder")) {
      const sortOrder = parseIntField(payload.sortOrder, "sortOrder");
      if (sortOrder !== undefined) {
        data.sortOrder = sortOrder;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new ProductsError(400, "Yangilash uchun kamida bitta maydon yuboring");
    }

    try {
      return await prisma.product.update({
        where: { id: productId },
        data,
        select: productSelect
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async remove(ownerId: string, branchId: string, productIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const productId = parseRequiredString(productIdRaw, "Mahsulot ID");

    const existing = await prisma.product.findFirst({
      where: {
        id: productId,
        branchId
      },
      select: { id: true }
    });

    if (!existing) {
      throw new ProductsError(404, "Mahsulot topilmadi");
    }

    return prisma.product.update({
      where: { id: productId },
      data: {
        isActive: false
      },
      select: productSelect
    });
  }
};
