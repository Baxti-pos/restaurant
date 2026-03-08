import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { isValidPermission } from "../../constants/permissions.js";
import { config } from "../../config.js";
import { prisma } from "../../prisma.js";
export class AuthError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AuthError";
    }
}
const mapRole = (role) => {
    if (role === "OWNER") {
        return "OWNER";
    }
    if (role === "MANAGER") {
        return "MANAGER";
    }
    return "WAITER";
};
const normalizePermissions = (values) => {
    if (!Array.isArray(values)) {
        return [];
    }
    const unique = [];
    const seen = new Set();
    for (const value of values) {
        if (!isValidPermission(value)) {
            continue;
        }
        if (seen.has(value)) {
            continue;
        }
        seen.add(value);
        unique.push(value);
    }
    return unique;
};
const buildTokenPayload = (params) => {
    return {
        sub: params.userId,
        role: params.role,
        fullName: params.fullName,
        permissions: params.permissions,
        branchId: params.branchId,
        activeBranchId: params.activeBranchId,
        tokenType: "access"
    };
};
const isObject = (value) => typeof value === "object" && value !== null;
const parseRequiredString = (value, label) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new AuthError(400, `${label} kiritilishi shart`);
    }
    return value.trim();
};
const normalizeUzPhone = (raw) => {
    const digits = raw.replace(/\D/g, "");
    const local = digits.startsWith("998") ? digits.slice(3) : digits;
    return `+998${local.slice(0, 9)}`;
};
const parseRequiredPhoneField = (value) => {
    if (typeof value !== "string" || !value.trim()) {
        throw new AuthError(400, "Telefon raqam kiritilishi shart");
    }
    const normalized = normalizeUzPhone(value);
    if (!/^\+998\d{9}$/.test(normalized)) {
        throw new AuthError(400, "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak");
    }
    return normalized;
};
const ensureOwnerContext = (ctx) => {
    if (ctx.role !== "OWNER" && ctx.role !== "MANAGER") {
        throw new AuthError(403, "Faqat owner yoki manager profili uchun ruxsat berilgan");
    }
};
const mapOwnerProfile = (user) => ({
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    role: mapRole(user.role),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
});
const mapAuthError = (error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return new AuthError(409, "Telefon raqam allaqachon ishlatilgan");
        }
    }
    return error;
};
export const signAccessToken = (payload) => {
    return jwt.sign(payload, config.jwtSecret, {
        expiresIn: "7d"
    });
};
export const verifyAccessToken = (token) => {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (typeof decoded === "string") {
        throw new AuthError(401, "Token yaroqsiz");
    }
    const candidate = decoded;
    if (candidate.tokenType !== "access" ||
        typeof candidate.sub !== "string" ||
        (candidate.role !== "OWNER" &&
            candidate.role !== "MANAGER" &&
            candidate.role !== "WAITER") ||
        typeof candidate.fullName !== "string") {
        throw new AuthError(401, "Token yaroqsiz");
    }
    return {
        sub: candidate.sub,
        role: candidate.role,
        fullName: candidate.fullName,
        permissions: normalizePermissions(candidate.permissions),
        branchId: typeof candidate.branchId === "string" ? candidate.branchId : null,
        activeBranchId: typeof candidate.activeBranchId === "string" ? candidate.activeBranchId : null,
        tokenType: "access"
    };
};
export const authService = {
    async login(input) {
        const phone = parseRequiredPhoneField(input.phone);
        const password = typeof input.password === "string" ? input.password.trim() : "";
        if (!password) {
            throw new AuthError(400, "Telefon raqam va parol kiritilishi shart");
        }
        const user = await prisma.user.findUnique({
            where: { phone },
            include: {
                ownedBranches: {
                    where: { isActive: true },
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        isActive: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        isActive: true
                    }
                },
                managerBranches: {
                    where: {
                        isActive: true,
                        branch: {
                            isActive: true
                        }
                    },
                    orderBy: {
                        createdAt: "asc"
                    },
                    select: {
                        branch: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                                isActive: true
                            }
                        }
                    }
                }
            }
        });
        if (!user || !user.passwordHash) {
            throw new AuthError(401, "Login yoki parol noto'g'ri");
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new AuthError(401, "Login yoki parol noto'g'ri");
        }
        if (!user.isActive) {
            throw new AuthError(403, "Foydalanuvchi faol emas");
        }
        const role = mapRole(user.role);
        const permissions = role === "MANAGER" ? normalizePermissions(user.permissions) : [];
        const userBranchId = user.branchId ?? null;
        const branches = role === "OWNER"
            ? user.ownedBranches
            : role === "MANAGER"
                ? user.managerBranches.map((assignment) => assignment.branch)
                : user.branch
                    ? [user.branch]
                    : [];
        if (role === "MANAGER" && branches.length === 0) {
            throw new AuthError(403, "Manager uchun faol filial biriktirilmagan");
        }
        const requiresBranchSelection = role === "OWNER";
        const activeBranchId = role === "WAITER"
            ? (userBranchId ?? null)
            : role === "MANAGER"
                ? branches[0]?.id ?? null
                : null;
        const accessToken = signAccessToken(buildTokenPayload({
            userId: user.id,
            role,
            fullName: user.fullName,
            permissions,
            branchId: userBranchId,
            activeBranchId
        }));
        return {
            accessToken,
            requiresBranchSelection,
            user: {
                id: user.id,
                fullName: user.fullName,
                phone: user.phone,
                role,
                permissions,
                branchId: userBranchId,
                activeBranchId
            },
            branches
        };
    },
    async selectBranch(input) {
        const branchId = typeof input.branchId === "string" ? input.branchId.trim() : "";
        if (!branchId) {
            throw new AuthError(400, "branchId yuborilishi shart");
        }
        if (input.role !== "OWNER" && input.role !== "MANAGER") {
            throw new AuthError(403, "Faqat owner yoki manager filial tanlashi mumkin");
        }
        const user = await prisma.user.findUnique({
            where: { id: input.userId },
            select: {
                id: true,
                fullName: true,
                role: true,
                permissions: true,
                branchId: true,
                isActive: true
            }
        });
        if (!user) {
            throw new AuthError(401, "Foydalanuvchi topilmadi");
        }
        if (!user.isActive) {
            throw new AuthError(403, "Foydalanuvchi faol emas");
        }
        const role = mapRole(user.role);
        const permissions = role === "MANAGER" ? normalizePermissions(user.permissions) : [];
        const branch = input.role === "OWNER"
            ? await prisma.branch.findFirst({
                where: {
                    id: branchId,
                    ownerId: user.id,
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    isActive: true
                }
            })
            : await prisma.managerBranch.findFirst({
                where: {
                    managerId: user.id,
                    branchId,
                    isActive: true,
                    branch: {
                        isActive: true
                    }
                },
                select: {
                    branch: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            isActive: true
                        }
                    }
                }
            }).then((row) => row?.branch ?? null);
        if (!branch) {
            throw new AuthError(404, input.role === "OWNER"
                ? "Filial topilmadi yoki sizga tegishli emas"
                : "Filial topilmadi yoki sizga biriktirilmagan");
        }
        const accessToken = signAccessToken(buildTokenPayload({
            userId: user.id,
            role,
            fullName: user.fullName,
            permissions,
            branchId: user.branchId ?? null,
            activeBranchId: branch.id
        }));
        return {
            accessToken,
            branch
        };
    },
    async getOwnerProfile(ctx) {
        ensureOwnerContext(ctx);
        const user = await prisma.user.findFirst({
            where: {
                id: ctx.userId,
                role: {
                    in: ["OWNER", "MANAGER"]
                }
            },
            select: {
                id: true,
                fullName: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            throw new AuthError(404, "Foydalanuvchi topilmadi");
        }
        if (!user.isActive) {
            throw new AuthError(403, "Foydalanuvchi faol emas");
        }
        return mapOwnerProfile(user);
    },
    async updateOwnerProfile(ctx, payload) {
        ensureOwnerContext(ctx);
        if (!isObject(payload)) {
            throw new AuthError(400, "So'rov ma'lumoti yaroqsiz");
        }
        const fullNameRaw = payload.fullName;
        const phoneRaw = payload.phone;
        const currentPasswordRaw = payload.currentPassword;
        const newPasswordRaw = payload.newPassword;
        const hasFullName = fullNameRaw !== undefined;
        const hasPhone = phoneRaw !== undefined;
        const hasCurrentPassword = currentPasswordRaw !== undefined;
        const hasNewPassword = newPasswordRaw !== undefined;
        if (!hasFullName && !hasPhone && !hasCurrentPassword && !hasNewPassword) {
            throw new AuthError(400, "Yangilash uchun kamida bitta maydon yuboring");
        }
        const owner = await prisma.user.findFirst({
            where: {
                id: ctx.userId,
                role: {
                    in: ["OWNER", "MANAGER"]
                }
            },
            select: {
                id: true,
                fullName: true,
                phone: true,
                role: true,
                branchId: true,
                permissions: true,
                isActive: true,
                passwordHash: true
            }
        });
        if (!owner) {
            throw new AuthError(404, "Foydalanuvchi topilmadi");
        }
        if (!owner.isActive) {
            throw new AuthError(403, "Foydalanuvchi faol emas");
        }
        const data = {};
        if (hasFullName) {
            data.fullName = parseRequiredString(fullNameRaw, "F.I.Sh");
        }
        if (hasPhone) {
            data.phone = parseRequiredPhoneField(phoneRaw);
        }
        if (hasCurrentPassword || hasNewPassword) {
            if (typeof currentPasswordRaw !== "string" || !currentPasswordRaw.trim()) {
                throw new AuthError(400, "Joriy parol kiritilishi shart");
            }
            if (typeof newPasswordRaw !== "string" || !newPasswordRaw.trim()) {
                throw new AuthError(400, "Yangi parol kiritilishi shart");
            }
            const newPassword = newPasswordRaw.trim();
            if (newPassword.length < 4) {
                throw new AuthError(400, "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak");
            }
            if (!owner.passwordHash) {
                throw new AuthError(400, "Parolni yangilash imkonsiz");
            }
            const isCurrentPasswordValid = await bcrypt.compare(currentPasswordRaw, owner.passwordHash);
            if (!isCurrentPasswordValid) {
                throw new AuthError(401, "Joriy parol noto'g'ri");
            }
            data.passwordHash = await bcrypt.hash(newPassword, 10);
        }
        if (Object.keys(data).length === 0) {
            throw new AuthError(400, "Yangilash uchun yaroqli ma'lumot yuboring");
        }
        try {
            const updated = await prisma.user.update({
                where: { id: owner.id },
                data,
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    role: true,
                    branchId: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            const accessToken = signAccessToken(buildTokenPayload({
                userId: updated.id,
                role: mapRole(updated.role),
                fullName: updated.fullName,
                permissions: mapRole(updated.role) === "MANAGER"
                    ? normalizePermissions(owner.permissions)
                    : [],
                branchId: updated.branchId ?? null,
                activeBranchId: ctx.activeBranchId
            }));
            return {
                profile: mapOwnerProfile(updated),
                accessToken
            };
        }
        catch (error) {
            throw mapAuthError(error);
        }
    }
};
