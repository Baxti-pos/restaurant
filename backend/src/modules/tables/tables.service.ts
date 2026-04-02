import { Prisma, TableStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";
import {
  buildPublicQrUrl,
  buildQrSvgMarkup,
  generatePublicToken
} from "../../utils/qr.js";

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

const parseBooleanField = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new TablesError(400, `${label} yaroqsiz`);
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

const tableNameCollator = new Intl.Collator("uz", {
  numeric: true,
  sensitivity: "base"
});

const sortTablesNaturally = <T extends { name: string }>(rows: T[]) =>
  [...rows].sort((a, b) => tableNameCollator.compare(a.name, b.name));

const mapPrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new TablesError(409, "Bunday stol nomi yoki QR token allaqachon mavjud");
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
  qrPublicToken: true,
  qrEnabled: true,
  selfOrderEnabled: true,
  callWaiterEnabled: true,
  qrVersion: true,
  qrLastGeneratedAt: true,
  qrLastScannedAt: true,
  createdAt: true,
  updatedAt: true,
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
      },
      items: {
        select: {
          quantity: true,
          fulfillmentStatus: true
        }
      }
    }
  },
  _count: {
    select: {
      qrOrderRequests: {
        where: {
          status: "PENDING"
        }
      },
      serviceRequests: {
        where: {
          status: {
            in: ["PENDING", "ACKNOWLEDGED"]
          }
        }
      }
    }
  }
} satisfies Prisma.TableSelect;

type TableRow = Prisma.TableGetPayload<{ select: typeof tableSelect }>;

const serializeTable = (table: TableRow) => {
  const currentOrderItems = table.orders[0]?.items ?? [];

  return {
    ...table,
    qrPublicUrl: buildPublicQrUrl(table.qrPublicToken),
    pendingQrOrdersCount: table._count.qrOrderRequests,
    activeServiceRequestsCount: table._count.serviceRequests,
    readyItemsCount: currentOrderItems.reduce(
      (sum, item) => sum + (item.fulfillmentStatus === "READY" ? item.quantity : 0),
      0
    ),
    currentOrderTotal: table.orders[0]?.totalAmount ?? null,
    currentOrderItemCount: currentOrderItems.reduce((sum, item) => sum + item.quantity, 0)
  };
};

const buildQrPayload = async (table: {
  id: string;
  name: string;
  qrPublicToken: string | null;
  qrEnabled: boolean;
  selfOrderEnabled: boolean;
  callWaiterEnabled: boolean;
  qrVersion: number;
  qrLastGeneratedAt: Date | null;
}) => {
  if (!table.qrPublicToken) {
    throw new TablesError(409, "Stol uchun QR hali yaratilmagan");
  }

  const publicUrl = buildPublicQrUrl(table.qrPublicToken);
  const svgMarkup = await buildQrSvgMarkup(table.qrPublicToken);

  return {
    tableId: table.id,
    tableName: table.name,
    qrPublicToken: table.qrPublicToken,
    qrEnabled: table.qrEnabled,
    selfOrderEnabled: table.selfOrderEnabled,
    callWaiterEnabled: table.callWaiterEnabled,
    qrVersion: table.qrVersion,
    qrLastGeneratedAt: table.qrLastGeneratedAt,
    publicUrl,
    svgMarkup
  };
};

export const tablesService = {
  async list(branchId: string) {
    await ensureActiveBranch(branchId);

    const rows = await prisma.table.findMany({
      where: { branchId },
      orderBy: [{ createdAt: "asc" }],
      select: tableSelect
    });

    return sortTablesNaturally(rows).map(serializeTable);
  },

  async getById(branchId: string, tableIdRaw: unknown) {
    await ensureActiveBranch(branchId);
    const tableId = parseRequiredString(tableIdRaw, "Stol ID");

    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        branchId
      },
      select: tableSelect
    });

    if (!table) {
      throw new TablesError(404, "Stol topilmadi");
    }

    return serializeTable(table);
  },

  async getQr(ownerId: string, branchId: string, tableIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const tableId = parseRequiredString(tableIdRaw, "Stol ID");

    let table = await prisma.table.findFirst({
      where: {
        id: tableId,
        branchId
      },
      select: {
        id: true,
        name: true,
        qrPublicToken: true,
        qrEnabled: true,
        selfOrderEnabled: true,
        callWaiterEnabled: true,
        qrVersion: true,
        qrLastGeneratedAt: true
      }
    });

    if (!table) {
      throw new TablesError(404, "Stol topilmadi");
    }

    if (!table.qrPublicToken) {
      table = await prisma.table.update({
        where: { id: table.id },
        data: {
          qrPublicToken: generatePublicToken(),
          qrLastGeneratedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          qrPublicToken: true,
          qrEnabled: true,
          selfOrderEnabled: true,
          callWaiterEnabled: true,
          qrVersion: true,
          qrLastGeneratedAt: true
        }
      });
    }

    return buildQrPayload(table);
  },

  async create(ownerId: string, branchId: string, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new TablesError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const name = parseRequiredString(payload.name, "Stol nomi");
    const seatsCount = parseIntField(payload.seatsCount, "seatsCount", { min: 1 });
    const status = parseTableStatus(payload.status);
    const selfOrderEnabled = parseBooleanField(payload.selfOrderEnabled, "selfOrderEnabled");
    const callWaiterEnabled = parseBooleanField(payload.callWaiterEnabled, "callWaiterEnabled");
    const qrEnabled = parseBooleanField(payload.qrEnabled, "qrEnabled");

    try {
      const table = await prisma.table.create({
        data: {
          branchId,
          name,
          qrPublicToken: generatePublicToken(),
          ...(seatsCount !== undefined ? { seatsCount } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(selfOrderEnabled !== undefined ? { selfOrderEnabled } : {}),
          ...(callWaiterEnabled !== undefined ? { callWaiterEnabled } : {}),
          ...(qrEnabled !== undefined ? { qrEnabled } : {}),
          qrLastGeneratedAt: new Date()
        },
        select: tableSelect
      });

      return {
        ...serializeTable(table),
        qr: await buildQrPayload(table)
      };
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

    if (Object.prototype.hasOwnProperty.call(payload, "qrEnabled")) {
      const qrEnabled = parseBooleanField(payload.qrEnabled, "qrEnabled");
      if (qrEnabled !== undefined) {
        data.qrEnabled = qrEnabled;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "selfOrderEnabled")) {
      const selfOrderEnabled = parseBooleanField(payload.selfOrderEnabled, "selfOrderEnabled");
      if (selfOrderEnabled !== undefined) {
        data.selfOrderEnabled = selfOrderEnabled;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "callWaiterEnabled")) {
      const callWaiterEnabled = parseBooleanField(payload.callWaiterEnabled, "callWaiterEnabled");
      if (callWaiterEnabled !== undefined) {
        data.callWaiterEnabled = callWaiterEnabled;
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

      return serializeTable(table);
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async regenerateQr(ownerId: string, branchId: string, tableIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const tableId = parseRequiredString(tableIdRaw, "Stol ID");

    const existing = await prisma.table.findFirst({
      where: {
        id: tableId,
        branchId
      },
      select: {
        id: true,
        name: true,
        qrEnabled: true,
        selfOrderEnabled: true,
        callWaiterEnabled: true,
        qrVersion: true
      }
    });

    if (!existing) {
      throw new TablesError(404, "Stol topilmadi");
    }

    try {
      const updated = await prisma.table.update({
        where: { id: existing.id },
        data: {
          qrPublicToken: generatePublicToken(),
          qrVersion: existing.qrVersion + 1,
          qrLastGeneratedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          qrPublicToken: true,
          qrEnabled: true,
          selfOrderEnabled: true,
          callWaiterEnabled: true,
          qrVersion: true,
          qrLastGeneratedAt: true
        }
      });

      return buildQrPayload(updated);
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

    return prisma.table.delete({
      where: { id: tableId },
      select: {
        id: true,
        branchId: true,
        name: true,
        seatsCount: true,
        status: true,
        qrPublicToken: true,
        qrEnabled: true,
        selfOrderEnabled: true,
        callWaiterEnabled: true,
        qrVersion: true,
        qrLastGeneratedAt: true,
        qrLastScannedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
};
