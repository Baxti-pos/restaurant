import { OrderStatus, PaymentMethod, Prisma, TableStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";
import type { AppRole } from "../auth/auth.service.js";

type TxClient = Prisma.TransactionClient;

interface OrderActor {
  userId: string;
  role: AppRole;
  shiftId?: string | null;
}

export class OrdersError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "OrdersError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const zeroDecimal = () => new Prisma.Decimal(0);

const clampMinZero = (value: Prisma.Decimal) => {
  if (value.lessThan(0)) {
    return zeroDecimal();
  }

  return value;
};

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new OrdersError(400, `${label} kiritilishi shart`);
  }

  return value.trim();
};

const parsePositiveInt = (value: unknown, label: string) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new OrdersError(400, `${label} musbat butun son bo'lishi kerak`);
  }

  return value;
};

const parseOptionalString = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new OrdersError(400, "Matn qiymati yaroqsiz");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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
      throw new OrdersError(400, `${label} kiritilishi shart`);
    }
    return undefined;
  }

  if (value === null) {
    if (nullable) {
      return null;
    }
    throw new OrdersError(400, `${label} yaroqsiz`);
  }

  let normalized: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new OrdersError(400, `${label} yaroqsiz`);
    }
    normalized = String(value);
  } else if (typeof value === "string") {
    normalized = value.trim();
    if (!normalized) {
      if (nullable) {
        return null;
      }
      throw new OrdersError(400, `${label} yaroqsiz`);
    }
  } else {
    throw new OrdersError(400, `${label} yaroqsiz`);
  }

  let decimal: Prisma.Decimal;
  try {
    decimal = new Prisma.Decimal(normalized);
  } catch {
    throw new OrdersError(400, `${label} yaroqsiz`);
  }

  if (decimal.lessThan(0)) {
    throw new OrdersError(400, `${label} manfiy bo'lishi mumkin emas`);
  }

  return decimal;
};

const parsePaymentMethod = (value: unknown, required = false) => {
  if (value === undefined) {
    if (required) {
      throw new OrdersError(400, "paymentMethod kiritilishi shart");
    }
    return undefined;
  }

  if (typeof value !== "string") {
    throw new OrdersError(400, "paymentMethod yaroqsiz");
  }

  const normalized = value.trim().toUpperCase();
  if (!Object.values(PaymentMethod).includes(normalized as PaymentMethod)) {
    throw new OrdersError(400, "paymentMethod yaroqsiz");
  }

  return normalized as PaymentMethod;
};

const parseOrderStatus = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new OrdersError(400, "status yaroqsiz");
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "ALL") {
    return "ALL" as const;
  }

  if (!Object.values(OrderStatus).includes(normalized as OrderStatus)) {
    throw new OrdersError(400, "status yaroqsiz");
  }

  return normalized as OrderStatus;
};

const parseDateField = (value: unknown, label: "from" | "to") => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new OrdersError(400, `${label} sanasi yaroqsiz`);
  }

  const trimmed = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T${label === "from" ? "00:00:00.000" : "23:59:59.999"}`)
    : new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    throw new OrdersError(400, `${label} sanasi yaroqsiz`);
  }

  return date;
};

const mapPrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new OrdersError(409, "Buyurtmani yaratishda konflikt yuz berdi");
    }
  }

  return error;
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
    throw new OrdersError(404, "Faol filial topilmadi");
  }
};

const orderSelect = {
  id: true,
  branchId: true,
  tableId: true,
  waiterId: true,
  shiftId: true,
  orderNumber: true,
  status: true,
  subtotalAmount: true,
  discountAmount: true,
  totalAmount: true,
  paidAmount: true,
  paymentMethod: true,
  note: true,
  openedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  table: {
    select: {
      id: true,
      name: true,
      status: true
    }
  },
  waiter: {
    select: {
      id: true,
      fullName: true
    }
  },
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderId: true,
      productId: true,
      productName: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
      note: true,
      createdAt: true,
      updatedAt: true
    }
  }
} as const;

const getOrderByIdTx = async (tx: TxClient, branchId: string, orderId: string) => {
  const order = await tx.order.findFirst({
    where: {
      id: orderId,
      branchId
    },
    select: orderSelect
  });

  if (!order) {
    throw new OrdersError(404, "Buyurtma topilmadi");
  }

  return order;
};

const getOpenOrderMinimalTx = async (tx: TxClient, branchId: string, orderId: string) => {
  const order = await tx.order.findFirst({
    where: {
      id: orderId,
      branchId
    },
    select: {
      id: true,
      branchId: true,
      tableId: true,
      waiterId: true,
      status: true,
      shiftId: true,
      discountAmount: true
    }
  });

  if (!order) {
    throw new OrdersError(404, "Buyurtma topilmadi");
  }

  if (order.status !== "OPEN") {
    throw new OrdersError(409, "Faqat ochiq buyurtma ustida amal bajarish mumkin");
  }

  return order;
};

const recalcOrderTotalsTx = async (tx: TxClient, orderId: string) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      discountAmount: true
    }
  });

  if (!order) {
    throw new OrdersError(404, "Buyurtma topilmadi");
  }

  const aggregated = await tx.orderItem.aggregate({
    where: { orderId },
    _sum: {
      lineTotal: true
    }
  });

  const subtotal = aggregated._sum.lineTotal ?? zeroDecimal();
  const discount = order.discountAmount ?? zeroDecimal();
  const total = clampMinZero(subtotal.minus(discount));

  return tx.order.update({
    where: { id: orderId },
    data: {
      subtotalAmount: subtotal,
      totalAmount: total
    },
    select: {
      id: true,
      subtotalAmount: true,
      discountAmount: true,
      totalAmount: true
    }
  });
};

const buildLineTotal = (unitPrice: Prisma.Decimal, quantity: number) => {
  return unitPrice.mul(new Prisma.Decimal(quantity));
};

export const ordersService = {
  async list(branchId: string, query?: Record<string, unknown>) {
    await ensureActiveBranch(branchId);

    const status = parseOrderStatus(query?.status);
    const from = parseDateField(query?.from, "from");
    const to = parseDateField(query?.to, "to");

    if (from && to && from > to) {
      throw new OrdersError(400, "from sanasi to sanasidan katta bo'lishi mumkin emas");
    }

    const where: Prisma.OrderWhereInput = {
      branchId
    };

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (from || to) {
      const dateFilter = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {})
      };

      if (status === "CLOSED") {
        where.closedAt = dateFilter;
      } else if (status === "OPEN") {
        where.openedAt = dateFilter;
      } else {
        where.OR = [
          {
            openedAt: dateFilter
          },
          {
            closedAt: dateFilter
          }
        ];
      }
    }

    return prisma.order.findMany({
      where,
      orderBy:
        status === "CLOSED"
          ? [{ closedAt: "desc" }, { openedAt: "desc" }]
          : status === "OPEN"
            ? [{ openedAt: "desc" }]
            : [{ createdAt: "desc" }],
      select: orderSelect
    });
  },

  async listOpen(branchId: string) {
    await ensureActiveBranch(branchId);

    return prisma.order.findMany({
      where: {
        branchId,
        status: "OPEN"
      },
      orderBy: [{ openedAt: "asc" }],
      select: orderSelect
    });
  },

  async getById(branchId: string, orderIdRaw: unknown) {
    await ensureActiveBranch(branchId);
    const orderId = parseRequiredString(orderIdRaw, "Buyurtma ID");

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        branchId
      },
      select: orderSelect
    });

    if (!order) {
      throw new OrdersError(404, "Buyurtma topilmadi");
    }

    return order;
  },

  async openForTable(params: {
    branchId: string;
    actor: OrderActor;
    payload: unknown;
  }) {
    const { branchId, actor, payload } = params;
    await ensureActiveBranch(branchId);

    if (!isObject(payload)) {
      throw new OrdersError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const tableId = parseRequiredString(payload.tableId, "Stol ID");

    try {
      return await prisma.$transaction(async (tx) => {
        const table = await tx.table.findFirst({
          where: {
            id: tableId,
            branchId
          },
          select: {
            id: true,
            name: true,
            status: true
          }
        });

        if (!table) {
          throw new OrdersError(404, "Stol topilmadi");
        }

        if (table.status === TableStatus.DISABLED) {
          throw new OrdersError(409, "Nofaol stol uchun buyurtma ochib bo'lmaydi");
        }

        const existingOpenOrder = await tx.order.findFirst({
          where: {
            branchId,
            tableId: table.id,
            status: "OPEN"
          },
          orderBy: {
            openedAt: "desc"
          },
          select: {
            id: true
          }
        });

        let tableStatusChanged = false;

        if (existingOpenOrder) {
          if (table.status !== TableStatus.OCCUPIED) {
            await tx.table.update({
              where: { id: table.id },
              data: { status: TableStatus.OCCUPIED }
            });
            tableStatusChanged = true;
          }

          const order = await getOrderByIdTx(tx, branchId, existingOpenOrder.id);
          return {
            order,
            table: {
              id: table.id,
              name: table.name,
              status: TableStatus.OCCUPIED
            },
            created: false,
            tableStatusChanged
          };
        }

        const lastOrder = await tx.order.findFirst({
          where: { branchId },
          orderBy: {
            orderNumber: "desc"
          },
          select: {
            orderNumber: true
          }
        });

        const nextOrderNumber = (lastOrder?.orderNumber ?? 0) + 1;

        const createdOrder = await tx.order.create({
          data: {
            branchId,
            tableId: table.id,
            waiterId: actor.role === "WAITER" ? actor.userId : null,
            shiftId: actor.role === "WAITER" ? (actor.shiftId ?? null) : null,
            orderNumber: nextOrderNumber,
            status: "OPEN"
          },
          select: {
            id: true
          }
        });

        if (table.status !== TableStatus.OCCUPIED) {
          await tx.table.update({
            where: { id: table.id },
            data: { status: TableStatus.OCCUPIED }
          });
          tableStatusChanged = true;
        }

        const order = await getOrderByIdTx(tx, branchId, createdOrder.id);

        return {
          order,
          table: {
            id: table.id,
            name: table.name,
            status: TableStatus.OCCUPIED
          },
          created: true,
          tableStatusChanged
        };
      });
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async addItem(params: {
    branchId: string;
    actor: OrderActor;
    orderIdRaw: unknown;
    payload: unknown;
  }) {
    const { branchId, actor, orderIdRaw, payload } = params;
    await ensureActiveBranch(branchId);

    if (!isObject(payload)) {
      throw new OrdersError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const orderId = parseRequiredString(orderIdRaw, "Buyurtma ID");
    const productId = parseRequiredString(payload.productId, "Mahsulot ID");
    const quantity = parsePositiveInt(payload.quantity, "quantity");
    const note = parseOptionalString(payload.note);

    return prisma.$transaction(async (tx) => {
      const openOrder = await getOpenOrderMinimalTx(tx, branchId, orderId);

      const product = await tx.product.findFirst({
        where: {
          id: productId,
          branchId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          price: true
        }
      });

      if (!product) {
        throw new OrdersError(404, "Mahsulot topilmadi");
      }

      const unitPrice = product.price;
      const lineTotal = buildLineTotal(unitPrice, quantity);

      await tx.orderItem.create({
        data: {
          orderId: openOrder.id,
          productId: product.id,
          productName: product.name,
          unitPrice,
          quantity,
          lineTotal,
          note: note ?? null
        }
      });

      if (actor.role === "WAITER" && (!openOrder.waiterId || !openOrder.shiftId)) {
        await tx.order.update({
          where: { id: openOrder.id },
          data: {
            ...(!openOrder.waiterId ? { waiterId: actor.userId } : {}),
            ...(!openOrder.shiftId && actor.shiftId ? { shiftId: actor.shiftId } : {})
          }
        });
      }

      await recalcOrderTotalsTx(tx, openOrder.id);
      const order = await getOrderByIdTx(tx, branchId, openOrder.id);

      return { order };
    });
  },

  async changeItem(params: {
    branchId: string;
    orderIdRaw: unknown;
    itemIdRaw: unknown;
    payload: unknown;
  }) {
    const { branchId, orderIdRaw, itemIdRaw, payload } = params;
    await ensureActiveBranch(branchId);

    if (!isObject(payload)) {
      throw new OrdersError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const orderId = parseRequiredString(orderIdRaw, "Buyurtma ID");
    const itemId = parseRequiredString(itemIdRaw, "Item ID");

    return prisma.$transaction(async (tx) => {
      const openOrder = await getOpenOrderMinimalTx(tx, branchId, orderId);

      const item = await tx.orderItem.findFirst({
        where: {
          id: itemId,
          orderId: openOrder.id
        },
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          note: true
        }
      });

      if (!item) {
        throw new OrdersError(404, "Buyurtma item topilmadi");
      }

      const data: Prisma.OrderItemUpdateInput = {};
      let nextQuantity = item.quantity;
      let nextUnitPrice = item.unitPrice;

      if (Object.prototype.hasOwnProperty.call(payload, "quantity")) {
        nextQuantity = parsePositiveInt(payload.quantity, "quantity");
        data.quantity = nextQuantity;
      }

      if (Object.prototype.hasOwnProperty.call(payload, "unitPrice")) {
        const parsedUnitPrice = parseDecimalField(payload.unitPrice, "unitPrice");
        if (!parsedUnitPrice || parsedUnitPrice === null) {
          throw new OrdersError(400, "unitPrice yaroqsiz");
        }
        nextUnitPrice = parsedUnitPrice;
        data.unitPrice = nextUnitPrice;
      }

      if (Object.prototype.hasOwnProperty.call(payload, "note")) {
        const note = parseOptionalString(payload.note);
        if (note !== undefined) {
          data.note = note;
        }
      }

      if (Object.keys(data).length === 0) {
        throw new OrdersError(400, "Yangilash uchun kamida bitta maydon yuboring");
      }

      data.lineTotal = buildLineTotal(nextUnitPrice, nextQuantity);

      await tx.orderItem.update({
        where: { id: item.id },
        data
      });

      await recalcOrderTotalsTx(tx, openOrder.id);
      const order = await getOrderByIdTx(tx, branchId, openOrder.id);

      return { order };
    });
  },

  async removeItem(params: {
    branchId: string;
    orderIdRaw: unknown;
    itemIdRaw: unknown;
  }) {
    const { branchId, orderIdRaw, itemIdRaw } = params;
    await ensureActiveBranch(branchId);

    const orderId = parseRequiredString(orderIdRaw, "Buyurtma ID");
    const itemId = parseRequiredString(itemIdRaw, "Item ID");

    return prisma.$transaction(async (tx) => {
      const openOrder = await getOpenOrderMinimalTx(tx, branchId, orderId);

      const item = await tx.orderItem.findFirst({
        where: {
          id: itemId,
          orderId: openOrder.id
        },
        select: { id: true }
      });

      if (!item) {
        throw new OrdersError(404, "Buyurtma item topilmadi");
      }

      await tx.orderItem.delete({
        where: { id: item.id }
      });

      await recalcOrderTotalsTx(tx, openOrder.id);
      const order = await getOrderByIdTx(tx, branchId, openOrder.id);

      return { order };
    });
  },

  async closeOrder(params: {
    branchId: string;
    orderIdRaw: unknown;
    payload: unknown;
  }) {
    const { branchId, orderIdRaw, payload } = params;
    await ensureActiveBranch(branchId);

    if (!isObject(payload)) {
      throw new OrdersError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const orderId = parseRequiredString(orderIdRaw, "Buyurtma ID");
    const paymentMethod = parsePaymentMethod(payload.paymentMethod, true)!;
    const discountAmount = parseDecimalField(payload.discountAmount, "discountAmount");
    const paidAmount = parseDecimalField(payload.paidAmount, "paidAmount");
    const note = parseOptionalString(payload.note);

    return prisma.$transaction(async (tx) => {
      const openOrder = await getOpenOrderMinimalTx(tx, branchId, orderId);
      const totals = await recalcOrderTotalsTx(tx, openOrder.id);

      const subtotal = totals.subtotalAmount ?? zeroDecimal();
      const currentDiscount = totals.discountAmount ?? zeroDecimal();
      const finalDiscount =
        discountAmount === undefined || discountAmount === null
          ? currentDiscount
          : discountAmount;
      const finalTotal = clampMinZero(subtotal.minus(finalDiscount));
      const finalPaid =
        paidAmount === undefined || paidAmount === null ? finalTotal : paidAmount;

      await tx.order.update({
        where: { id: openOrder.id },
        data: {
          status: "CLOSED",
          paymentMethod,
          discountAmount: finalDiscount,
          totalAmount: finalTotal,
          paidAmount: finalPaid,
          closedAt: new Date(),
          ...(note !== undefined ? { note } : {})
        }
      });

      let tableStatusChanged = false;
      let table: { id: string; name: string; status: TableStatus } | null = null;

      if (openOrder.tableId) {
        const remainingOpenOrders = await tx.order.count({
          where: {
            tableId: openOrder.tableId,
            status: "OPEN"
          }
        });

        const existingTable = await tx.table.findUnique({
          where: { id: openOrder.tableId },
          select: {
            id: true,
            name: true,
            status: true
          }
        });

        if (existingTable) {
          if (
            remainingOpenOrders === 0 &&
            existingTable.status !== TableStatus.DISABLED &&
            existingTable.status !== TableStatus.AVAILABLE
          ) {
            table = await tx.table.update({
              where: { id: existingTable.id },
              data: { status: TableStatus.AVAILABLE },
              select: {
                id: true,
                name: true,
                status: true
              }
            });
            tableStatusChanged = true;
          } else {
            table = existingTable;
          }
        }
      }

      const order = await getOrderByIdTx(tx, branchId, openOrder.id);

      return {
        order,
        table,
        tableStatusChanged
      };
    });
  }
};
