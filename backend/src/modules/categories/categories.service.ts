import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

export class CategoriesError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "CategoriesError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new CategoriesError(400, `${label} kiritilishi shart`);
  }

  return value.trim();
};

const parseBooleanField = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new CategoriesError(400, "Boolean qiymat yaroqsiz");
  }

  return value;
};

const parseIntField = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new CategoriesError(400, `${label} butun son bo'lishi kerak`);
  }

  return value;
};

const mapPrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new CategoriesError(409, "Bunday kategoriya nomi allaqachon mavjud");
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
    throw new CategoriesError(404, "Faol filial topilmadi");
  }
};

const categorySelect = {
  id: true,
  branchId: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} as const;

export const categoriesService = {
  async list(ownerId: string, branchId: string) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    return prisma.category.findMany({
      where: { branchId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        ...categorySelect,
        _count: {
          select: {
            products: true
          }
        }
      }
    });
  },

  async getById(ownerId: string, branchId: string, categoryIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const categoryId = parseRequiredString(categoryIdRaw, "Kategoriya ID");

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        branchId
      },
      select: {
        ...categorySelect,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!category) {
      throw new CategoriesError(404, "Kategoriya topilmadi");
    }

    return category;
  },

  async create(ownerId: string, branchId: string, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new CategoriesError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const name = parseRequiredString(payload.name, "Kategoriya nomi");
    const sortOrder = parseIntField(payload.sortOrder, "sortOrder");
    const isActive = parseBooleanField(payload.isActive);

    try {
      const category = await prisma.category.create({
        data: {
          branchId,
          name,
          ...(sortOrder !== undefined ? { sortOrder } : {}),
          ...(isActive !== undefined ? { isActive } : {})
        },
        select: categorySelect
      });

      return category;
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async update(ownerId: string, branchId: string, categoryIdRaw: unknown, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new CategoriesError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const categoryId = parseRequiredString(categoryIdRaw, "Kategoriya ID");

    const existing = await prisma.category.findFirst({
      where: {
        id: categoryId,
        branchId
      },
      select: { id: true }
    });

    if (!existing) {
      throw new CategoriesError(404, "Kategoriya topilmadi");
    }

    const data: Prisma.CategoryUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(payload, "name")) {
      data.name = parseRequiredString(payload.name, "Kategoriya nomi");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "sortOrder")) {
      const sortOrder = parseIntField(payload.sortOrder, "sortOrder");
      if (sortOrder !== undefined) {
        data.sortOrder = sortOrder;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "isActive")) {
      const isActive = parseBooleanField(payload.isActive);
      if (isActive !== undefined) {
        data.isActive = isActive;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new CategoriesError(400, "Yangilash uchun kamida bitta maydon yuboring");
    }

    try {
      const category = await prisma.category.update({
        where: { id: categoryId },
        data,
        select: categorySelect
      });

      return category;
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async remove(ownerId: string, branchId: string, categoryIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const categoryId = parseRequiredString(categoryIdRaw, "Kategoriya ID");

    const existing = await prisma.category.findFirst({
      where: {
        id: categoryId,
        branchId
      },
      select: { id: true }
    });

    if (!existing) {
      throw new CategoriesError(404, "Kategoriya topilmadi");
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: { isActive: false },
      select: categorySelect
    });

    return category;
  }
};
