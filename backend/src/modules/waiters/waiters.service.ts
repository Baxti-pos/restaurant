import { Prisma, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../../prisma.js";

export class WaitersError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "WaitersError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new WaitersError(400, `${label} kiritilishi shart`);
  }

  return value.trim();
};

const normalizeUzPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("998") ? digits.slice(3) : digits;
  return `+998${local.slice(0, 9)}`;
};

const parseRequiredPhoneField = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new WaitersError(400, "Telefon raqam kiritilishi shart");
  }

  const normalized = normalizeUzPhone(value);
  if (!/^\+998\d{9}$/.test(normalized)) {
    throw new WaitersError(400, "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak");
  }

  return normalized;
};

const parsePasswordField = (
  value: unknown,
  options: { required?: boolean } = {}
) => {
  const { required = false } = options;

  if (value === undefined) {
    if (required) {
      throw new WaitersError(400, "Parol kiritilishi shart");
    }

    return undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new WaitersError(400, "Parol yaroqsiz");
  }

  const trimmed = value.trim();
  if (trimmed.length < 4) {
    throw new WaitersError(400, "Parol kamida 4 ta belgidan iborat bo'lishi kerak");
  }

  return trimmed;
};

const parseBooleanField = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new WaitersError(400, `${label} yaroqsiz`);
  }

  return value;
};

const parseRequiredBooleanField = (value: unknown, label: string) => {
  const parsed = parseBooleanField(value, label);
  if (parsed === undefined) {
    throw new WaitersError(400, `${label} kiritilishi shart`);
  }

  return parsed;
};

const parseSharePercentField = (
  value: unknown,
  label: string,
  options: { required?: boolean } = {}
) => {
  const { required = false } = options;

  if (value === undefined) {
    if (required) {
      throw new WaitersError(400, `${label} kiritilishi shart`);
    }
    return undefined;
  }

  if (value === null) {
    throw new WaitersError(400, `${label} yaroqsiz`);
  }

  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    throw new WaitersError(400, `${label} yaroqsiz`);
  }

  if (parsed < 0 || parsed > 100) {
    throw new WaitersError(400, `${label} 0 dan 100 gacha bo'lishi kerak`);
  }

  return Number(parsed.toFixed(2));
};

const serializeWaiter = (waiter: {
  id: string;
  fullName: string;
  phone: string | null;
  salesSharePercent: Prisma.Decimal;
  role: UserRole;
  isActive: boolean;
  branchId: string | null;
  createdAt: Date;
  updatedAt: Date;
  waiterShifts?: any[];
}) => {
  const { waiterShifts, ...rest } = waiter;
  return {
    ...rest,
    name: rest.fullName,
    salesSharePercent: Number(rest.salesSharePercent),
    shiftStatus: (waiterShifts && waiterShifts.length > 0 ? "active" : "not_started") as any
  };
};

const mapPrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new WaitersError(409, "Telefon raqam allaqachon ishlatilgan");
    }
  }

  return error;
};

export const ensureOwnedActiveBranch = async (ownerId: string, branchId: string) => {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      ownerId,
      isActive: true
    },
    select: { id: true }
  });

  if (!branch) {
    throw new WaitersError(404, "Faol filial topilmadi");
  }
};

const waiterSelect = {
  id: true,
  fullName: true,
  phone: true,
  salesSharePercent: true,
  role: true,
  isActive: true,
  branchId: true,
  createdAt: true,
  updatedAt: true,
  waiterShifts: {
    where: { status: "OPEN" },
    take: 1
  }
} as const;

export const waitersService = {
  async list(ownerId: string, branchId: string) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    const waiters = await prisma.user.findMany({
      where: {
        branchId,
        role: UserRole.WAITER
      },
      orderBy: [{ createdAt: "asc" }],
      select: waiterSelect
    });

    return waiters.map(serializeWaiter);
  },

  async getById(ownerId: string, branchId: string, waiterIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const waiterId = parseRequiredString(waiterIdRaw, "Waiter ID");

    const waiter = await prisma.user.findFirst({
      where: {
        id: waiterId,
        branchId,
        role: UserRole.WAITER
      },
      select: waiterSelect
    });

    if (!waiter) {
      throw new WaitersError(404, "Waiter topilmadi");
    }

    return serializeWaiter(waiter);
  },

  async create(ownerId: string, branchId: string, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new WaitersError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const fullName = parseRequiredString(payload.fullName, "F.I.Sh");
    const phone = parseRequiredPhoneField(payload.phone);
    const password = parsePasswordField(payload.password, { required: true })!;
    const salesSharePercent = parseSharePercentField(
      payload.salesSharePercent,
      "Ulush foizi",
      { required: true }
    );
    const isActive = parseRequiredBooleanField(payload.isActive, "isActive");

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const waiter = await prisma.user.create({
        data: {
          fullName,
          phone,
          passwordHash,
          salesSharePercent: salesSharePercent!,
          role: UserRole.WAITER,
          branchId,
          isActive
        },
        select: waiterSelect
      });

      return serializeWaiter(waiter);
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async update(ownerId: string, branchId: string, waiterIdRaw: unknown, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!isObject(payload)) {
      throw new WaitersError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const waiterId = parseRequiredString(waiterIdRaw, "Waiter ID");

    const existing = await prisma.user.findFirst({
      where: {
        id: waiterId,
        branchId,
        role: UserRole.WAITER
      },
      select: { id: true }
    });

    if (!existing) {
      throw new WaitersError(404, "Waiter topilmadi");
    }

    const requiredFields = ["fullName", "phone", "salesSharePercent", "isActive"] as const;

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(payload, field)) {
        throw new WaitersError(400, "Yangilashda barcha maydonlar yuborilishi shart");
      }
    }

    const password = parsePasswordField(payload.password);

    const data: Prisma.UserUpdateInput = {
      fullName: parseRequiredString(payload.fullName, "F.I.Sh"),
      phone: parseRequiredPhoneField(payload.phone),
      salesSharePercent: parseSharePercentField(
        payload.salesSharePercent,
        "Ulush foizi",
        { required: true }
      )!,
      isActive: parseRequiredBooleanField(payload.isActive, "isActive"),
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {})
    };

    try {
      const waiter = await prisma.user.update({
        where: { id: waiterId },
        data,
        select: waiterSelect
      });

      return serializeWaiter(waiter);
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async remove(ownerId: string, branchId: string, waiterIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const waiterId = parseRequiredString(waiterIdRaw, "Waiter ID");

    const existing = await prisma.user.findFirst({
      where: {
        id: waiterId,
        branchId,
        role: UserRole.WAITER
      },
      select: { id: true }
    });

    if (!existing) {
      throw new WaitersError(404, "Waiter topilmadi");
    }

    const waiter = await prisma.user.delete({
      where: { id: waiterId },
      select: waiterSelect
    });

    return serializeWaiter(waiter);
  },

  async getShifts(ownerId: string, branchId: string, waiterIdRaw: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const waiterId = parseRequiredString(waiterIdRaw, "Waiter ID");

    const shifts = await prisma.waiterShift.findMany({
      where: {
        branchId,
        waiterId,
      },
      orderBy: { openedAt: "desc" },
      include: {
        openedBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } }
      }
    });

    return shifts.map(s => ({
      ...s,
      startingCash: Number(s.startingCash),
      endingCash: s.endingCash ? Number(s.endingCash) : null
    }));
  },

  async openShift(ownerId: string, branchId: string, waiterIdRaw: unknown, managerId: string, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const waiterId = parseRequiredString(waiterIdRaw, "Waiter ID");

    const openShift = await prisma.waiterShift.findFirst({
      where: { branchId, waiterId, status: "OPEN" }
    });

    if (openShift) {
      throw new WaitersError(400, "Ushbu girgitton uchun ochiq smena mavjud");
    }

    const startingCash = isObject(payload) && typeof payload.startingCash === 'number' ? payload.startingCash : 0;
    const openingNote = isObject(payload) && typeof payload.openingNote === 'string' ? payload.openingNote : null;

    const shift = await prisma.waiterShift.create({
      data: {
        branchId,
        waiterId,
        openedById: managerId,
        status: "OPEN",
        startingCash,
        openingNote
      },
      include: {
        openedBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } }
      }
    });

    return {
      ...shift,
      startingCash: Number(shift.startingCash),
      endingCash: null
    };
  },

  async closeShift(ownerId: string, branchId: string, waiterIdRaw: unknown, managerId: string, payload: unknown) {
    await ensureOwnedActiveBranch(ownerId, branchId);
    const waiterId = parseRequiredString(waiterIdRaw, "Waiter ID");

    const openShift = await prisma.waiterShift.findFirst({
      where: { branchId, waiterId, status: "OPEN" }
    });

    if (!openShift) {
      throw new WaitersError(404, "Ochiq smena topilmadi");
    }

    const endingCash = isObject(payload) && typeof payload.endingCash === 'number' ? payload.endingCash : Number(openShift.startingCash);
    const closingNote = isObject(payload) && typeof payload.closingNote === 'string' ? payload.closingNote : null;

    const shift = await prisma.waiterShift.update({
      where: { id: openShift.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedById: managerId,
        endingCash,
        closingNote
      },
      include: {
        openedBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } }
      }
    });

    return {
      ...shift,
      startingCash: Number(shift.startingCash),
      endingCash: Number(shift.endingCash)
    };
  }
};
