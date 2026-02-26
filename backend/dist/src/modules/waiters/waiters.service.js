import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../prisma.js";
export class WaitersError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "WaitersError";
    }
}
const isObject = (value) => typeof value === "object" && value !== null;
const parseRequiredString = (value, label) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new WaitersError(400, `${label} kiritilishi shart`);
    }
    return value.trim();
};
const parseNullableStringField = (value, label) => {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (typeof value !== "string") {
        throw new WaitersError(400, `${label} yaroqsiz`);
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};
const parseBooleanField = (value, label) => {
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== "boolean") {
        throw new WaitersError(400, `${label} yaroqsiz`);
    }
    return value;
};
const parseTelegramUserIdField = (value) => {
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
const serializeWaiter = (waiter) => ({
    ...waiter,
    telegramUserId: waiter.telegramUserId ? waiter.telegramUserId.toString() : null
});
const mapPrismaError = (error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return new WaitersError(409, "Telefon raqam yoki telegramUserId allaqachon ishlatilgan");
        }
    }
    return error;
};
const ensureOwnedActiveBranch = async (ownerId, branchId) => {
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
    role: true,
    isActive: true,
    branchId: true,
    createdAt: true,
    updatedAt: true
};
export const waitersService = {
    async list(ownerId, branchId) {
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
    async getById(ownerId, branchId, waiterIdRaw) {
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
    async create(ownerId, branchId, payload) {
        await ensureOwnedActiveBranch(ownerId, branchId);
        if (!isObject(payload)) {
            throw new WaitersError(400, "So'rov ma'lumoti yaroqsiz");
        }
        const fullName = parseRequiredString(payload.fullName, "F.I.Sh");
        const phone = parseNullableStringField(payload.phone, "Telefon raqam");
        const telegramUserId = parseTelegramUserIdField(payload.telegramUserId);
        const isActive = parseBooleanField(payload.isActive, "isActive");
        try {
            const waiter = await prisma.user.create({
                data: {
                    fullName,
                    phone: phone ?? null,
                    telegramUserId: telegramUserId ?? null,
                    role: UserRole.WAITER,
                    branchId,
                    ...(isActive !== undefined ? { isActive } : {})
                },
                select: waiterSelect
            });
            return serializeWaiter(waiter);
        }
        catch (error) {
            throw mapPrismaError(error);
        }
    },
    async update(ownerId, branchId, waiterIdRaw, payload) {
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
        const data = {};
        if (Object.prototype.hasOwnProperty.call(payload, "fullName")) {
            data.fullName = parseRequiredString(payload.fullName, "F.I.Sh");
        }
        if (Object.prototype.hasOwnProperty.call(payload, "phone")) {
            const phone = parseNullableStringField(payload.phone, "Telefon raqam");
            if (phone !== undefined) {
                data.phone = phone;
            }
        }
        if (Object.prototype.hasOwnProperty.call(payload, "telegramUserId")) {
            const telegramUserId = parseTelegramUserIdField(payload.telegramUserId);
            if (telegramUserId !== undefined) {
                data.telegramUserId = telegramUserId;
            }
        }
        if (Object.prototype.hasOwnProperty.call(payload, "isActive")) {
            const isActive = parseBooleanField(payload.isActive, "isActive");
            if (isActive !== undefined) {
                data.isActive = isActive;
            }
        }
        if (Object.keys(data).length === 0) {
            throw new WaitersError(400, "Yangilash uchun kamida bitta maydon yuboring");
        }
        try {
            const waiter = await prisma.user.update({
                where: { id: waiterId },
                data,
                select: waiterSelect
            });
            return serializeWaiter(waiter);
        }
        catch (error) {
            throw mapPrismaError(error);
        }
    },
    async remove(ownerId, branchId, waiterIdRaw) {
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
        const waiter = await prisma.user.update({
            where: { id: waiterId },
            data: { isActive: false },
            select: waiterSelect
        });
        return serializeWaiter(waiter);
    }
};
