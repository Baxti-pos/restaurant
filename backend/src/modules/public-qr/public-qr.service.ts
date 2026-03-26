import { Prisma, QrOrderRequestStatus, ServiceRequestStatus } from "@prisma/client";
import { prisma } from "../../prisma.js";
import {
  generatePublicCode,
  generatePublicToken,
  hashValue
} from "../../utils/qr.js";

const publicMenuProductSelect = {
  id: true,
  branchId: true,
  categoryId: true,
  name: true,
  price: true,
  portionLabel: true,
  imageUrl: true,
  description: true,
  isActive: true,
  sortOrder: true,
  category: {
    select: {
      id: true,
      name: true,
      sortOrder: true,
      isActive: true
    }
  }
} as const;

type PublicMenuProduct = Prisma.ProductGetPayload<{ select: typeof publicMenuProductSelect }>;

interface PublicContext {
  branchId: string;
  branchName: string;
  tableId: string;
  tableName: string;
  qrEnabled: boolean;
  selfOrderEnabled: boolean;
  callWaiterEnabled: boolean;
  tableStatus: string;
}

interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export class PublicQrError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "PublicQrError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new PublicQrError(400, `${label} kiritilishi shart`);
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
    throw new PublicQrError(400, "Matn qiymati yaroqsiz");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parsePositiveInt = (value: unknown, label: string) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new PublicQrError(400, `${label} musbat butun son bo'lishi kerak`);
  }

  return value;
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

const parseItems = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PublicQrError(400, "Kamida bitta mahsulot yuborilishi shart");
  }

  if (value.length > 30) {
    throw new PublicQrError(400, "Bir martada juda ko'p mahsulot yuborildi");
  }

  return value.map((item, index) => {
    if (!isObject(item)) {
      throw new PublicQrError(400, `${index + 1}-mahsulot yaroqsiz`);
    }

    return {
      productId: parseRequiredString(item.productId, "Mahsulot ID"),
      quantity: parsePositiveInt(item.quantity, "Miqdor"),
      note: parseOptionalString(item.note) ?? null
    };
  });
};

const ensurePublicContext = async (qrTokenRaw: unknown): Promise<PublicContext> => {
  const qrToken = parseRequiredString(qrTokenRaw, "QR token");

  const table = await prisma.table.findFirst({
    where: {
      qrPublicToken: qrToken,
      branch: {
        isActive: true
      }
    },
    select: {
      id: true,
      name: true,
      status: true,
      qrEnabled: true,
      selfOrderEnabled: true,
      callWaiterEnabled: true,
      branch: {
        select: {
          id: true,
          name: true,
          isActive: true
        }
      }
    }
  });

  if (!table || !table.branch.isActive) {
    throw new PublicQrError(404, "QR faol emas yoki stol topilmadi");
  }

  if (!table.qrEnabled) {
    throw new PublicQrError(403, "Bu stol uchun QR vaqtincha o'chirilgan");
  }

  return {
    branchId: table.branch.id,
    branchName: table.branch.name,
    tableId: table.id,
    tableName: table.name,
    qrEnabled: table.qrEnabled,
    selfOrderEnabled: table.selfOrderEnabled,
    callWaiterEnabled: table.callWaiterEnabled,
    tableStatus: table.status
  };
};

const mapMenuProduct = (product: PublicMenuProduct) => ({
  id: product.id,
  branchId: product.branchId,
  categoryId: product.categoryId,
  categoryName: product.category.name,
  name: product.name,
  price: decimalToNumber(product.price),
  portionLabel: product.portionLabel,
  imageUrl: product.imageUrl,
  description: product.description,
  sortOrder: product.sortOrder
});

const buildTrackingStatus = (params: {
  requestStatus: QrOrderRequestStatus;
  itemStatuses: string[];
}) => {
  if (params.requestStatus === "PENDING") {
    return "PENDING";
  }

  if (params.requestStatus === "REJECTED") {
    return "REJECTED";
  }

  if (params.requestStatus === "CANCELED") {
    return "CANCELED";
  }

  if (params.itemStatuses.length === 0) {
    return "ACCEPTED";
  }

  if (params.itemStatuses.every((status) => status === "SERVED")) {
    return "SERVED";
  }

  if (params.itemStatuses.some((status) => status === "READY" || status === "SERVED")) {
    return "READY";
  }

  if (params.itemStatuses.some((status) => status === "PREPARING")) {
    return "PREPARING";
  }

  return "ACCEPTED";
};

const ensureSession = async (
  ctx: PublicContext,
  sessionKeyRaw: unknown,
  meta: RequestMeta,
  options?: { createIfMissing?: boolean }
) => {
  const createIfMissing = options?.createIfMissing ?? false;
  const sessionKey = typeof sessionKeyRaw === "string" ? sessionKeyRaw.trim() : "";

  if (sessionKey) {
    const existing = await prisma.guestTableSession.findFirst({
      where: {
        publicSessionKey: sessionKey,
        branchId: ctx.branchId,
        tableId: ctx.tableId,
        status: "OPEN"
      },
      select: {
        id: true,
        publicSessionKey: true,
        status: true,
        startedAt: true,
        lastSeenAt: true,
        lastSubmittedAt: true
      }
    });

    if (existing) {
      await prisma.guestTableSession.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: new Date()
        }
      });

      return existing;
    }
  }

  if (!createIfMissing) {
    throw new PublicQrError(401, "Session topilmadi yoki muddati tugagan");
  }

  return prisma.guestTableSession.create({
    data: {
      branchId: ctx.branchId,
      tableId: ctx.tableId,
      publicSessionKey: generatePublicToken(),
      status: "OPEN",
      ipHash: hashValue(meta.ip),
      userAgentHash: hashValue(meta.userAgent)
    },
    select: {
      id: true,
      publicSessionKey: true,
      status: true,
      startedAt: true,
      lastSeenAt: true,
      lastSubmittedAt: true
    }
  });
};

export const publicQrService = {
  async bootstrap(qrTokenRaw: unknown) {
    const ctx = await ensurePublicContext(qrTokenRaw);

    const products = await prisma.product.findMany({
      where: {
        branchId: ctx.branchId,
        isActive: true,
        category: {
          isActive: true
        }
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { createdAt: "asc" }
      ],
      select: publicMenuProductSelect
    });

    const categories = products.reduce<Array<{ id: string; name: string; sortOrder: number }>>(
      (acc, product) => {
        if (acc.some((item) => item.id === product.category.id)) {
          return acc;
        }

        acc.push({
          id: product.category.id,
          name: product.category.name,
          sortOrder: product.category.sortOrder
        });
        return acc;
      },
      []
    );

    await prisma.table.update({
      where: { id: ctx.tableId },
      data: {
        qrLastScannedAt: new Date()
      }
    });

    return {
      branch: {
        id: ctx.branchId,
        name: ctx.branchName
      },
      table: {
        id: ctx.tableId,
        name: ctx.tableName,
        status: ctx.tableStatus,
        qrEnabled: ctx.qrEnabled,
        selfOrderEnabled: ctx.selfOrderEnabled,
        callWaiterEnabled: ctx.callWaiterEnabled
      },
      categories: categories.sort((a, b) => a.sortOrder - b.sortOrder),
      products: products.map(mapMenuProduct)
    };
  },

  async createSession(qrTokenRaw: unknown, payload: unknown, meta: RequestMeta) {
    const ctx = await ensurePublicContext(qrTokenRaw);

    const session = await ensureSession(
      ctx,
      isObject(payload) ? payload.sessionKey : undefined,
      meta,
      { createIfMissing: true }
    );

    return {
      sessionKey: session.publicSessionKey,
      startedAt: session.startedAt,
      lastSeenAt: session.lastSeenAt,
      lastSubmittedAt: session.lastSubmittedAt
    };
  },

  async createOrderRequest(qrTokenRaw: unknown, payload: unknown, meta: RequestMeta) {
    const ctx = await ensurePublicContext(qrTokenRaw);

    if (!ctx.selfOrderEnabled) {
      throw new PublicQrError(403, "Bu stol uchun QR buyurtma o'chirilgan");
    }

    if (!isObject(payload)) {
      throw new PublicQrError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const clientRequestId = parseRequiredString(payload.clientRequestId, "clientRequestId");
    const note = parseOptionalString(payload.note) ?? null;
    const items = parseItems(payload.items);
    const session = await ensureSession(ctx, payload.sessionKey, meta);

    const existingRequest = await prisma.qrOrderRequest.findFirst({
      where: {
        guestSessionId: session.id,
        clientRequestId
      },
      select: {
        id: true,
        publicCode: true,
        status: true,
        createdAt: true
      }
    });

    if (existingRequest) {
      return {
        requestId: existingRequest.id,
        publicCode: existingRequest.publicCode,
        status: existingRequest.status,
        createdAt: existingRequest.createdAt,
        duplicated: true,
        branchId: ctx.branchId,
        tableId: ctx.tableId
      };
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        branchId: ctx.branchId,
        isActive: true,
        category: {
          isActive: true
        }
      },
      select: publicMenuProductSelect
    });

    if (products.length !== productIds.length) {
      throw new PublicQrError(409, "Ba'zi mahsulotlar faol emas yoki topilmadi");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const subtotalAmount = items.reduce((sum, item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        return sum;
      }

      return sum + decimalToNumber(product.price) * item.quantity;
    }, 0);

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.qrOrderRequest.create({
        data: {
          publicCode: generatePublicCode("qr"),
          clientRequestId,
          branchId: ctx.branchId,
          tableId: ctx.tableId,
          guestSessionId: session.id,
          status: "PENDING",
          note,
          subtotalAmount: new Prisma.Decimal(subtotalAmount.toFixed(2)),
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: product.id,
                productNameSnapshot: product.name,
                productImageUrlSnapshot: product.imageUrl,
                portionLabelSnapshot: product.portionLabel,
                unitPriceSnapshot: product.price,
                quantity: item.quantity,
                note: item.note
              };
            })
          }
        },
        select: {
          id: true,
          publicCode: true,
          status: true,
          createdAt: true
        }
      });

      await tx.guestTableSession.update({
        where: { id: session.id },
        data: {
          lastSeenAt: new Date(),
          lastSubmittedAt: new Date()
        }
      });

      return created;
    });

    return {
      requestId: request.id,
      publicCode: request.publicCode,
      status: request.status,
      createdAt: request.createdAt,
      duplicated: false,
      branchId: ctx.branchId,
      tableId: ctx.tableId,
      tableName: ctx.tableName,
      itemCount: items.length,
      subtotalAmount
    };
  },

  async getOrderRequestStatus(qrTokenRaw: unknown, publicCodeRaw: unknown) {
    const ctx = await ensurePublicContext(qrTokenRaw);
    const publicCode = parseRequiredString(publicCodeRaw, "Request kodi");

    const request = await prisma.qrOrderRequest.findFirst({
      where: {
        publicCode,
        branchId: ctx.branchId,
        tableId: ctx.tableId
      },
      select: {
        id: true,
        publicCode: true,
        status: true,
        note: true,
        rejectionReason: true,
        createdAt: true,
        acceptedAt: true,
        rejectedAt: true,
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
        orderItems: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            fulfillmentStatus: true,
            productName: true,
            quantity: true,
            note: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    if (!request) {
      throw new PublicQrError(404, "Buyurtma topilmadi");
    }

    const trackingStatus = buildTrackingStatus({
      requestStatus: request.status,
      itemStatuses: request.orderItems.map((item) => item.fulfillmentStatus)
    });

    return {
      id: request.id,
      publicCode: request.publicCode,
      status: request.status,
      trackingStatus,
      note: request.note,
      rejectionReason: request.rejectionReason,
      createdAt: request.createdAt,
      acceptedAt: request.acceptedAt,
      rejectedAt: request.rejectedAt,
      subtotalAmount: decimalToNumber(request.subtotalAmount),
      items: request.items.map((item) => ({
        id: item.id,
        productName: item.productNameSnapshot,
        portionLabel: item.portionLabelSnapshot,
        imageUrl: item.productImageUrlSnapshot,
        quantity: item.quantity,
        unitPrice: decimalToNumber(item.unitPriceSnapshot),
        note: item.note
      })),
      orderItems: request.orderItems.map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        note: item.note,
        fulfillmentStatus: item.fulfillmentStatus,
        updatedAt: item.updatedAt
      }))
    };
  },

  async cancelOrderRequest(qrTokenRaw: unknown, publicCodeRaw: unknown, payload: unknown, meta: RequestMeta) {
    const ctx = await ensurePublicContext(qrTokenRaw);
    const publicCode = parseRequiredString(publicCodeRaw, "Request kodi");

    if (!isObject(payload)) {
      throw new PublicQrError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const session = await ensureSession(ctx, payload.sessionKey, meta);

    const request = await prisma.qrOrderRequest.findFirst({
      where: {
        publicCode,
        branchId: ctx.branchId,
        tableId: ctx.tableId,
        guestSessionId: session.id
      },
      select: {
        id: true,
        status: true
      }
    });

    if (!request) {
      throw new PublicQrError(404, "Buyurtma topilmadi");
    }

    if (request.status !== "PENDING") {
      throw new PublicQrError(409, "Faqat kutilayotgan buyurtmani bekor qilish mumkin");
    }

    return prisma.qrOrderRequest.update({
      where: { id: request.id },
      data: {
        status: "CANCELED"
      },
      select: {
        id: true,
        publicCode: true,
        status: true
      }
    });
  },

  async createServiceRequest(qrTokenRaw: unknown, payload: unknown, meta: RequestMeta) {
    const ctx = await ensurePublicContext(qrTokenRaw);

    if (!ctx.callWaiterEnabled) {
      throw new PublicQrError(403, "Bu stol uchun girgitton chaqirish o'chirilgan");
    }

    if (!isObject(payload)) {
      throw new PublicQrError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const note = parseOptionalString(payload.note) ?? null;
    const session = await ensureSession(ctx, payload.sessionKey, meta);

    const activeCall = await prisma.serviceRequest.findFirst({
      where: {
        tableId: ctx.tableId,
        guestSessionId: session.id,
        status: {
          in: ["PENDING", "ACKNOWLEDGED"]
        }
      },
      select: {
        id: true,
        publicCode: true,
        status: true,
        createdAt: true
      }
    });

    if (activeCall) {
      return {
        requestId: activeCall.id,
        publicCode: activeCall.publicCode,
        status: activeCall.status,
        createdAt: activeCall.createdAt,
        duplicated: true,
        branchId: ctx.branchId,
        tableId: ctx.tableId
      };
    }

    const created = await prisma.serviceRequest.create({
      data: {
        publicCode: generatePublicCode("call"),
        branchId: ctx.branchId,
        tableId: ctx.tableId,
        guestSessionId: session.id,
        requestType: "CALL_WAITER",
        status: "PENDING",
        note
      },
      select: {
        id: true,
        publicCode: true,
        status: true,
        createdAt: true
      }
    });

    await prisma.guestTableSession.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date()
      }
    });

    return {
      requestId: created.id,
      publicCode: created.publicCode,
      status: created.status,
      createdAt: created.createdAt,
      duplicated: false,
      branchId: ctx.branchId,
      tableId: ctx.tableId,
      tableName: ctx.tableName
    };
  },

  async getServiceRequestStatus(qrTokenRaw: unknown, publicCodeRaw: unknown) {
    const ctx = await ensurePublicContext(qrTokenRaw);
    const publicCode = parseRequiredString(publicCodeRaw, "Request kodi");

    const request = await prisma.serviceRequest.findFirst({
      where: {
        publicCode,
        branchId: ctx.branchId,
        tableId: ctx.tableId
      },
      select: {
        id: true,
        publicCode: true,
        status: true,
        note: true,
        createdAt: true,
        acknowledgedAt: true,
        completedAt: true
      }
    });

    if (!request) {
      throw new PublicQrError(404, "Chaqiruv topilmadi");
    }

    return request;
  }
};
