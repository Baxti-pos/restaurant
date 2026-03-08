import { Prisma, TableStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";

export class TablesError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "TablesError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new TablesError(400, `${label} kiritilishi shart`);
  }

  return value.trim();
};

const parseIntField = (value: unknown, label: string, options?: { min?: number }) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new TablesError(400, `${label} butun son bo'lishi kerak`);
  }

  const min = options?.min;
  if (min !== undefined && value < min) {
    throw new TablesError(400, `${label} ${min} dan kichik bo'lishi mumkin emas`);
  }

  return value;
};

const parseTableStatus = (value: unknown, required = false) => {
  if (value === undefined) {
    if (required) {
      throw new TablesError(400, "status kiritilishi shart");
    }
    return undefined;
  }

  if (typeof value !== "string") {
    throw new TablesError(400, "status yaroqsiz");
  }

  const normalized = value.trim().toUpperCase();
  if (!Object.values(TableStatus).includes(normalized as TableStatus)) {
    throw new TablesError(400, "status yaroqsiz");
  }

  return normalized as TableStatus;
};

const ensureActiveBranch = async (branchId: string) => {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      isActive: true
    },
    select: { id: true }
  });

  if (!branch) {
    throw new TablesError(404, "Faol filial topilmadi");
  }
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
    throw new TablesError(404, "Faol filial topilmadi");
  }
};

const mapPrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new TablesError(409, "Bunday stol nomi allaqachon mavjud");
    }
  }

  return error;
};

const tableSelect = {
  id: true,
  branchId: true,
  name: true,
  seatsCount: true,
  status: true,
  createdAt: true,
  updatedAt: true
} as const;

export const tablesService = {
  async list(branchId: string) {
    await ensureActiveBranch(branchId);

    return prisma.table.findMany({
      where: { branchId },
      orderBy: [{ name: "asc" }],
      select: {
        ...tableSelect,
        orders: {
          where: {
            status: "OPEN"
          },
          orderBy: {
            openedAt: "desc"
          },
          take: 1,
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            openedAt: true,
            waiterId: true,
            waiter: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });
  },

  async getById(branchId: string, tableIdRaw: unknown) {
    await ensureActiveBranch(branchId);
    const tableId = parseRequiredString(tableIdRaw, "Stol ID");

    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        branchId
      },
      select: {
        ...tableSelect,
        orders: {
          where: {
            status: "OPEN"
          },
          orderBy: {
            openedAt: "desc"
          },
          take: 1,
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            openedAt: true,
            waiterId: true,
            waiter: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    if (!table) {
      throw new TablesError(404, "Stol topilmadi");
    }

    return table;
  },

  async create(ownerId: string, branchId: string, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new TablesError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const name = parseRequiredString(payload.name, "Stol nomi");
    const seatsCount = parseIntField(payload.seatsCount, "seatsCount", { min: 1 });
    const status = parseTableStatus(payload.status);

    try {
      const table = await prisma.table.create({
        data: {
          branchId,
          name,
          ...(seatsCount !== undefined ? { seatsCount } : {}),
          ...(status !== undefined ? { status } : {})
        },
        select: tableSelect
      });

      return table;
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async update(ownerId: string, branchId: string, tableIdRaw: unknown, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new TablesError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const tableId = parseRequiredString(tableIdRaw, "Stol ID");

    const existing = await prisma.table.findFirst({
      where: {
        id: tableId,
        branchId
      },
      select: { id: true, status: true }
    });

    if (!existing) {
      throw new TablesError(404, "Stol topilmadi");
    }

    const data: Prisma.TableUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(payload, "name")) {
      data.name = parseRequiredString(payload.name, "Stol nomi");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "seatsCount")) {
      const seatsCount = parseIntField(payload.seatsCount, "seatsCount", { min: 1 });
      if (seatsCount !== undefined) {
        data.seatsCount = seatsCount;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "status")) {
      const status = parseTableStatus(payload.status);
      if (status !== undefined) {
        if (status === TableStatus.AVAILABLE) {
          const openOrder = await prisma.order.findFirst({
            where: {
              tableId,
              status: "OPEN"
            },
            select: { id: true }
          });

          if (openOrder) {
            throw new TablesError(409, "Ochiq buyurtmasi bor stolni AVAILABLE qilib bo'lmaydi");
          }
        }

        data.status = status;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new TablesError(400, "Yangilash uchun kamida bitta maydon yuboring");
    }

    try {
      const table = await prisma.table.update({
        where: { id: tableId },
        data,
        select: tableSelect
      });

      return table;
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async remove(ownerId: string, branchId: string, tableIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const tableId = parseRequiredString(tableIdRaw, "Stol ID");

    const existing = await prisma.table.findFirst({
      where: {
        id: tableId,
        branchId
      },
      select: { id: true }
    });

    if (!existing) {
      throw new TablesError(404, "Stol topilmadi");
    }

    const openOrder = await prisma.order.findFirst({
      where: {
        tableId,
        status: "OPEN"
      },
      select: { id: true }
    });

    if (openOrder) {
      throw new TablesError(409, "Ochiq buyurtmasi bor stolni o'chirib bo'lmaydi");
    }

    const table = await prisma.table.delete({
      where: { id: tableId },
      select: tableSelect
    });

    return table;
  }
};
