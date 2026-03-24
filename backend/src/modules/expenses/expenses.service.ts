import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

export class ExpensesError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ExpensesError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ExpensesError(400, `${label} kiritilishi shart`);
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

  if (typeof value !== "string") {
    throw new ExpensesError(400, "Matn qiymati yaroqsiz");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseDecimalField = (
  value: unknown,
  label: string,
  options?: { required?: boolean }
) => {
  const required = options?.required ?? false;

  if (value === undefined) {
    if (required) {
      throw new ExpensesError(400, `${label} kiritilishi shart`);
    }
    return undefined;
  }

  let normalized: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ExpensesError(400, `${label} yaroqsiz`);
    }
    normalized = String(value);
  } else if (typeof value === "string") {
    normalized = value.trim();
    if (!normalized) {
      throw new ExpensesError(400, `${label} yaroqsiz`);
    }
  } else {
    throw new ExpensesError(400, `${label} yaroqsiz`);
  }

  let decimal: Prisma.Decimal;
  try {
    decimal = new Prisma.Decimal(normalized);
  } catch {
    throw new ExpensesError(400, `${label} yaroqsiz`);
  }

  if (decimal.lessThan(0)) {
    throw new ExpensesError(400, `${label} manfiy bo'lishi mumkin emas`);
  }

  return decimal;
};

const parseDateField = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new ExpensesError(400, `${label} yaroqsiz`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ExpensesError(400, `${label} yaroqsiz`);
  }

  return date;
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
    throw new ExpensesError(404, "Faol filial topilmadi");
  }
};

const expenseSelect = {
  id: true,
  branchId: true,
  createdById: true,
  title: true,
  amount: true,
  description: true,
  spentAt: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true
    }
  },
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      fullName: true
    }
  }
} as const;

export const expensesService = {
  async list(ownerId: string, branchId: string, query?: { from?: unknown; to?: unknown }) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    const from = parseDateField(query?.from, "from");
    const to = parseDateField(query?.to, "to");

    if (from && to && from > to) {
      throw new ExpensesError(400, "from sanasi to sanasidan katta bo'lishi mumkin emas");
    }

    return prisma.expense.findMany({
      where: {
        branchId,
        ...(from || to
          ? {
              spentAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {})
              }
            }
          : {})
      },
      orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
      select: expenseSelect
    });
  },

  async getById(ownerId: string, branchId: string, expenseIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const expenseId = parseRequiredString(expenseIdRaw, "Xarajat ID");

    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        branchId
      },
      select: expenseSelect
    });

    if (!expense) {
      throw new ExpensesError(404, "Xarajat topilmadi");
    }

    return expense;
  },

  async create(ownerId: string, branchId: string, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new ExpensesError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const title = parseRequiredString(payload.title, "Sarlavha");
    const amount = parseDecimalField(payload.amount, "Miqdor", { required: true })!;
    const description = parseOptionalString(payload.description);
    const categoryId = parseOptionalString(payload.categoryId);
    const spentAt = parseDateField(payload.spentAt, "spentAt");

    return (prisma as any).expense.create({
      data: {
        branchId,
        createdById: ownerId,
        title,
        amount,
        categoryId: categoryId ?? null,
        description: description ?? null,
        ...(spentAt ? { spentAt } : {})
      },
      select: expenseSelect
    });
  },

  async update(ownerId: string, branchId: string, expenseIdRaw: unknown, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new ExpensesError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const expenseId = parseRequiredString(expenseIdRaw, "Xarajat ID");

    const existing = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        branchId
      },
      select: { id: true }
    });

    if (!existing) {
      throw new ExpensesError(404, "Xarajat topilmadi");
    }

    const data: Prisma.ExpenseUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(payload, "title")) {
      data.title = parseRequiredString(payload.title, "Sarlavha");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "amount")) {
      const amount = parseDecimalField(payload.amount, "Miqdor");
      if (amount !== undefined) {
        data.amount = amount;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "description")) {
      const description = parseOptionalString(payload.description);
      if (description !== undefined) {
        data.description = description;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "spentAt")) {
      const spentAt = parseDateField(payload.spentAt, "spentAt");
      if (spentAt !== undefined) {
        data.spentAt = spentAt;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "categoryId")) {
      const categoryId = parseOptionalString(payload.categoryId);
      if (categoryId !== undefined) {
        (data as any).categoryId = categoryId;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new ExpensesError(400, "Yangilash uchun kamida bitta maydon yuboring");
    }

    return (prisma as any).expense.update({
      where: { id: expenseId },
      data,
      select: expenseSelect
    });
  },

  async remove(ownerId: string, branchId: string, expenseIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const expenseId = parseRequiredString(expenseIdRaw, "Xarajat ID");

    const existing = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        branchId
      },
      select: { id: true }
    });

    if (!existing) {
      throw new ExpensesError(404, "Xarajat topilmadi");
    }

    return prisma.expense.delete({
      where: { id: expenseId },
      select: expenseSelect
    });
  }
};
