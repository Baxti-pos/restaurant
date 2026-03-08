import { Prisma, UserRole } from "@prisma/client";
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

const parseTelegramUserIdField = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isInteger(value) || value <= 0) {
      throw new WaitersError(400, "telegramUserId yaroqsiz");
    }

    return BigInt(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    if (!/^\d+$/.test(trimmed)) {
      throw new WaitersError(400, "telegramUserId yaroqsiz");
    }

    return BigInt(trimmed);
  }

  throw new WaitersError(400, "telegramUserId yaroqsiz");
};

const parseTelegramUsernameField = (
  value: unknown,
  options: { required?: boolean } = {}
) => {
  const { required = false } = options;

  if (value === undefined) {
    if (required) {
      throw new WaitersError(400, "telegramUsername kiritilishi shart");
    }
    return undefined;
  }

  if (value === null) {
    if (required) {
      throw new WaitersError(400, "telegramUsername kiritilishi shart");
    }
    return null;
  }

  if (typeof value !== "string") {
    throw new WaitersError(400, "telegramUsername yaroqsiz");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    if (required) {
      throw new WaitersError(400, "telegramUsername kiritilishi shart");
    }
    return null;
  }

  if (!/^@?[A-Za-z0-9_]{5,32}$/.test(trimmed)) {
    throw new WaitersError(400, "telegramUsername yaroqsiz");
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
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
  telegramUserId: bigint | null;
  telegramUsername: string | null;
  salesSharePercent: Prisma.Decimal;
  role: UserRole;
  isActive: boolean;
  branchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...waiter,
  telegramUserId: waiter.telegramUserId ? waiter.telegramUserId.toString() : null,
  salesSharePercent: Number(waiter.salesSharePercent)
});

const mapPrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new WaitersError(
        409,
        "Telefon raqam, telegramUserId yoki telegramUsername allaqachon ishlatilgan"
      );
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
    throw new WaitersError(404, "Faol filial topilmadi");
  }
};

const waiterSelect = {
  id: true,
  fullName: true,
  phone: true,
  telegramUserId: true,
  telegramUsername: true,
  salesSharePercent: true,
  role: true,
  isActive: true,
  branchId: true,
  createdAt: true,
  updatedAt: true
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
    const telegramUserId = parseTelegramUserIdField(payload.telegramUserId);
    const telegramUsername = parseTelegramUsernameField(payload.telegramUsername, {
      required: true
    });
    const salesSharePercent = parseSharePercentField(
      payload.salesSharePercent,
      "Ulush foizi",
      { required: true }
    );
    const isActive = parseRequiredBooleanField(payload.isActive, "isActive");

    try {
      const waiter = await prisma.user.create({
        data: {
          fullName,
          phone,
          telegramUserId: telegramUserId ?? null,
          telegramUsername: telegramUsername ?? null,
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

    const requiredFields = [
      "fullName",
      "phone",
      "telegramUsername",
      "salesSharePercent",
      "isActive"
    ] as const;

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(payload, field)) {
        throw new WaitersError(400, "Yangilashda barcha maydonlar yuborilishi shart");
      }
    }

    const data: Prisma.UserUpdateInput = {
      fullName: parseRequiredString(payload.fullName, "F.I.Sh"),
      phone: parseRequiredPhoneField(payload.phone),
      telegramUsername: parseTelegramUsernameField(payload.telegramUsername, {
        required: true
      }),
      salesSharePercent: parseSharePercentField(
        payload.salesSharePercent,
        "Ulush foizi",
        { required: true }
      )!,
      isActive: parseRequiredBooleanField(payload.isActive, "isActive")
    };

    if (Object.prototype.hasOwnProperty.call(payload, "telegramUserId")) {
      const telegramUserId = parseTelegramUserIdField(payload.telegramUserId);
      if (telegramUserId !== undefined) {
        data.telegramUserId = telegramUserId;
      }
    } else {
      data.telegramUserId = null;
    }

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
  }
};
