import {
  OrderStatus,
  Prisma,
  QrOrderRequestStatus,
  ServiceRequestStatus,
  TableStatus
} from "@prisma/client";
import { prisma } from "../../prisma.js";
import type { AppRole } from "../auth/auth.service.js";

const zeroDecimal = () => new Prisma.Decimal(0);

type TxClient = Prisma.TransactionClient;

export interface GuestRequestActor {
  userId: string;
  role: AppRole;
  shiftId?: string | null;
}

export class GuestRequestsError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "GuestRequestsError";
  }
}

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new GuestRequestsError(400, `${label} kiritilishi shart`);
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
    throw new GuestRequestsError(400, "Matn qiymati yaroqsiz");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const decimalToNumber = (value: Prisma.Decimal | string | number | null | undefined) => {
  if (value instanceof Prisma.Decimal) {
    return Number(value.toString());
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  return 0;
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
    throw new GuestRequestsError(404, "Faol filial topilmadi");
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
      requestId: true,
      guestSessionId: true,
      productName: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
      source: true,
      fulfillmentStatus: true,
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
    throw new GuestRequestsError(404, "Buyurtma topilmadi");
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
    throw new GuestRequestsError(404, "Buyurtma topilmadi");
  }

  const aggregated = await tx.orderItem.aggregate({
    where: { orderId },
    _sum: {
      lineTotal: true
    }
  });

  const subtotal = aggregated._sum.lineTotal ?? zeroDecimal();
  const discount = order.discountAmount ?? zeroDecimal();
  const total = subtotal.minus(discount).lessThan(0) ? zeroDecimal() : subtotal.minus(discount);

  return tx.order.update({
    where: { id: orderId },
    data: {
      subtotalAmount: subtotal,
      totalAmount: total
    },
    select: {
      id: true,
      subtotalAmount: true,
      totalAmount: true
    }
  });
};

const buildPendingOrderPayload = (request: {
  id: string;
  publicCode: string;
  note: string | null;
  createdAt: Date;
  subtotalAmount: Prisma.Decimal;
  table: { id: string; name: string };
  items: Array<{ id: string }>;
}) => ({
  id: request.id,
  publicCode: request.publicCode,
  note: request.note,
  createdAt: request.createdAt,
  subtotalAmount: decimalToNumber(request.subtotalAmount),
  itemCount: request.items.length,
  table: request.table
});

const buildServiceRequestPayload = (request: {
  id: string;
  publicCode: string;
  note: string | null;
  status: ServiceRequestStatus;
  createdAt: Date;
  table: { id: string; name: string };
}) => ({
  id: request.id,
  publicCode: request.publicCode,
  note: request.note,
  status: request.status,
  createdAt: request.createdAt,
  table: request.table
});

export const guestRequestsService = {
  async listOverview(branchId: string) {
    await ensureActiveBranch(branchId);

    const [pendingOrders, activeServiceRequests] = await Promise.all([
      prisma.qrOrderRequest.findMany({
        where: {
          branchId,
          status: "PENDING"
        },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          publicCode: true,
          note: true,
          createdAt: true,
          subtotalAmount: true,
          table: {
            select: {
              id: true,
              name: true
            }
          },
          items: {
            select: {
              id: true
            }
          }
        }
      }),
      prisma.serviceRequest.findMany({
        where: {
          branchId,
          status: {
            in: ["PENDING", "ACKNOWLEDGED"]
          }
        },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          publicCode: true,
          note: true,
          status: true,
          createdAt: true,
          table: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    ]);

    return {
      pendingOrders: pendingOrders.map(buildPendingOrderPayload),
      activeServiceRequests: activeServiceRequests.map(buildServiceRequestPayload)
    };
  },

  async getTableInbox(branchId: string, tableIdRaw: unknown) {
    await ensureActiveBranch(branchId);
    const tableId = parseRequiredString(tableIdRaw, "Stol ID");

    const [pendingOrders, activeServiceRequests] = await Promise.all([
      prisma.qrOrderRequest.findMany({
        where: {
          branchId,
          tableId,
          status: "PENDING"
        },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          publicCode: true,
          note: true,
          createdAt: true,
          subtotalAmount: true,
          items: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              productNameSnapshot: true,
              portionLabelSnapshot: true,
              productImageUrlSnapshot: true,
              quantity: true,
              unitPriceSnapshot: true,
              note: true
            }
          },
          table: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.serviceRequest.findMany({
        where: {
          branchId,
          tableId,
          status: {
            in: ["PENDING", "ACKNOWLEDGED"]
          }
        },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          publicCode: true,
          note: true,
          status: true,
          createdAt: true,
          table: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })
    ]);

    return {
      pendingOrders: pendingOrders.map((request) => ({
        ...buildPendingOrderPayload(request),
        items: request.items.map((item) => ({
          id: item.id,
          productName: item.productNameSnapshot,
          portionLabel: item.portionLabelSnapshot,
          imageUrl: item.productImageUrlSnapshot,
          quantity: item.quantity,
          unitPrice: decimalToNumber(item.unitPriceSnapshot),
          note: item.note
        }))
      })),
      activeServiceRequests: activeServiceRequests.map(buildServiceRequestPayload)
    };
  },

  async acceptOrderRequest(branchId: string, actor: GuestRequestActor, requestIdRaw: unknown) {
    await ensureActiveBranch(branchId);
    const requestId = parseRequiredString(requestIdRaw, "Request ID");

    return prisma.$transaction(async (tx) => {
      const request = await tx.qrOrderRequest.findFirst({
        where: {
          id: requestId,
          branchId
        },
        select: {
          id: true,
          branchId: true,
          tableId: true,
          guestSessionId: true,
          status: true,
          note: true,
          table: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          items: {
            orderBy: { createdAt: "asc" },
            select: {
              productId: true,
              productNameSnapshot: true,
              quantity: true,
              unitPriceSnapshot: true,
              note: true
            }
          }
        }
      });

      if (!request) {
        throw new GuestRequestsError(404, "QR buyurtma topilmadi");
      }

      if (request.status !== "PENDING") {
        throw new GuestRequestsError(409, "Faqat kutilayotgan QR buyurtmani qabul qilish mumkin");
      }

      let orderId: string;
      let tableStatusChanged = false;

      const existingOpenOrder = await tx.order.findFirst({
        where: {
          branchId,
          tableId: request.tableId,
          status: "OPEN"
        },
        orderBy: { openedAt: "desc" },
        select: {
          id: true,
          waiterId: true,
          shiftId: true
        }
      });

      if (existingOpenOrder) {
        orderId = existingOpenOrder.id;

        if (actor.role === "WAITER" && (!existingOpenOrder.waiterId || !existingOpenOrder.shiftId)) {
          await tx.order.update({
            where: { id: existingOpenOrder.id },
            data: {
              ...(!existingOpenOrder.waiterId ? { waiterId: actor.userId } : {}),
              ...(!existingOpenOrder.shiftId && actor.shiftId ? { shiftId: actor.shiftId } : {})
            }
          });
        }
      } else {
        const lastOrder = await tx.order.findFirst({
          where: { branchId },
          orderBy: { orderNumber: "desc" },
          select: { orderNumber: true }
        });

        const createdOrder = await tx.order.create({
          data: {
            branchId,
            tableId: request.tableId,
            waiterId: actor.role === "WAITER" ? actor.userId : null,
            shiftId: actor.role === "WAITER" ? (actor.shiftId ?? null) : null,
            orderNumber: (lastOrder?.orderNumber ?? 0) + 1,
            status: "OPEN"
          },
          select: { id: true }
        });

        orderId = createdOrder.id;
      }

      if (request.table.status !== TableStatus.OCCUPIED) {
        await tx.table.update({
          where: { id: request.tableId },
          data: {
            status: TableStatus.OCCUPIED
          }
        });
        tableStatusChanged = true;
      }

      for (const item of request.items) {
        await tx.orderItem.create({
          data: {
            orderId,
            productId: item.productId,
            requestId: request.id,
            guestSessionId: request.guestSessionId,
            productName: item.productNameSnapshot,
            unitPrice: item.unitPriceSnapshot,
            quantity: item.quantity,
            lineTotal: item.unitPriceSnapshot.mul(item.quantity),
            source: "QR_CUSTOMER",
            fulfillmentStatus: "ACCEPTED",
            note: item.note
          }
        });
      }

      await recalcOrderTotalsTx(tx, orderId);

      await tx.qrOrderRequest.update({
        where: { id: request.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedById: actor.userId,
          linkedOrderId: orderId
        }
      });

      const order = await getOrderByIdTx(tx, branchId, orderId);

      return {
        order,
        branchId,
        tableId: request.tableId,
        tableName: request.table.name,
        requestId: request.id,
        tableStatusChanged
      };
    });
  },

  async rejectOrderRequest(
    branchId: string,
    actor: GuestRequestActor,
    requestIdRaw: unknown,
    payload: unknown
  ) {
    await ensureActiveBranch(branchId);
    const requestId = parseRequiredString(requestIdRaw, "Request ID");
    const reason = parseOptionalString((payload as Record<string, unknown> | null)?.reason) ?? null;

    const request = await prisma.qrOrderRequest.findFirst({
      where: {
        id: requestId,
        branchId
      },
      select: {
        id: true,
        status: true,
        tableId: true,
        table: {
          select: {
            name: true
          }
        }
      }
    });

    if (!request) {
      throw new GuestRequestsError(404, "QR buyurtma topilmadi");
    }

    if (request.status !== "PENDING") {
      throw new GuestRequestsError(409, "Faqat kutilayotgan QR buyurtmani rad etish mumkin");
    }

    await prisma.qrOrderRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectedById: actor.userId,
        rejectionReason: reason
      }
    });

    return {
      branchId,
      tableId: request.tableId,
      tableName: request.table.name,
      requestId: request.id,
      rejectionReason: reason
    };
  },

  async acknowledgeServiceRequest(branchId: string, actor: GuestRequestActor, requestIdRaw: unknown) {
    await ensureActiveBranch(branchId);
    const requestId = parseRequiredString(requestIdRaw, "Request ID");

    const request = await prisma.serviceRequest.findFirst({
      where: {
        id: requestId,
        branchId
      },
      select: {
        id: true,
        status: true,
        tableId: true,
        table: {
          select: {
            name: true
          }
        }
      }
    });

    if (!request) {
      throw new GuestRequestsError(404, "Chaqiruv topilmadi");
    }

    if (request.status !== "PENDING") {
      throw new GuestRequestsError(409, "Faqat yangi chaqiruvni qabul qilish mumkin");
    }

    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        acknowledgedById: actor.userId
      }
    });

    return {
      branchId,
      tableId: request.tableId,
      tableName: request.table.name,
      requestId: request.id
    };
  },

  async completeServiceRequest(branchId: string, actor: GuestRequestActor, requestIdRaw: unknown) {
    await ensureActiveBranch(branchId);
    const requestId = parseRequiredString(requestIdRaw, "Request ID");

    const request = await prisma.serviceRequest.findFirst({
      where: {
        id: requestId,
        branchId
      },
      select: {
        id: true,
        status: true,
        tableId: true,
        table: {
          select: {
            name: true
          }
        }
      }
    });

    if (!request) {
      throw new GuestRequestsError(404, "Chaqiruv topilmadi");
    }

    if (!(["PENDING", "ACKNOWLEDGED"] as ServiceRequestStatus[]).includes(request.status)) {
      throw new GuestRequestsError(409, "Faqat faol chaqiruvni yakunlash mumkin");
    }

    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedById: actor.userId,
        ...(request.status === "PENDING"
          ? {
              acknowledgedAt: new Date(),
              acknowledgedById: actor.userId
            }
          : {})
      }
    });

    return {
      branchId,
      tableId: request.tableId,
      tableName: request.table.name,
      requestId: request.id
    };
  }
};
