import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { Prisma } from "@prisma/client";
import { config } from "../../config.js";
import { prisma } from "../../prisma.js";

export type AppRole = "OWNER" | "WAITER";

export interface AppJwtPayload {
  sub: string;
  role: AppRole;
  fullName: string;
  branchId: string | null;
  activeBranchId: string | null;
  tokenType: "access";
}

interface LoginInput {
  phone?: unknown;
  password?: unknown;
}

interface SelectBranchInput {
  userId: string;
  role: AppRole;
  branchId?: unknown;
}

interface OwnerProfileContext {
  userId: string;
  role: AppRole;
  activeBranchId: string | null;
}

export class AuthError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AuthError";
  }
}

const mapRole = (role: UserRole): AppRole => {
  if (role === "OWNER") {
    return "OWNER";
  }

  return "WAITER";
};

const buildTokenPayload = (params: {
  userId: string;
  role: AppRole;
  fullName: string;
  branchId: string | null;
  activeBranchId: string | null;
}): AppJwtPayload => {
  return {
    sub: params.userId,
    role: params.role,
    fullName: params.fullName,
    branchId: params.branchId,
    activeBranchId: params.activeBranchId,
    tokenType: "access"
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AuthError(400, `${label} kiritilishi shart`);
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
    throw new AuthError(400, "Telefon raqam kiritilishi shart");
  }

  const normalized = normalizeUzPhone(value);
  if (!/^\+998\d{9}$/.test(normalized)) {
    throw new AuthError(400, "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak");
  }

  return normalized;
};

const ensureOwnerContext = (ctx: OwnerProfileContext) => {
  if (ctx.role !== "OWNER") {
    throw new AuthError(403, "Faqat owner profili uchun ruxsat berilgan");
  }
};

const mapOwnerProfile = (user: {
  id: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: user.id,
  fullName: user.fullName,
  phone: user.phone,
  role: mapRole(user.role),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const mapAuthError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new AuthError(409, "Telefon raqam allaqachon ishlatilgan");
    }
  }

  return error;
};

export const signAccessToken = (payload: AppJwtPayload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: "7d"
  });
};

export const verifyAccessToken = (token: string): AppJwtPayload => {
  const decoded = jwt.verify(token, config.jwtSecret);

  if (typeof decoded === "string") {
    throw new AuthError(401, "Token yaroqsiz");
  }

  const candidate = decoded as JwtPayload & Partial<AppJwtPayload>;

  if (
    candidate.tokenType !== "access" ||
    typeof candidate.sub !== "string" ||
    (candidate.role !== "OWNER" && candidate.role !== "WAITER") ||
    typeof candidate.fullName !== "string"
  ) {
    throw new AuthError(401, "Token yaroqsiz");
  }

  return {
    sub: candidate.sub,
    role: candidate.role,
    fullName: candidate.fullName,
    branchId: typeof candidate.branchId === "string" ? candidate.branchId : null,
    activeBranchId:
      typeof candidate.activeBranchId === "string" ? candidate.activeBranchId : null,
    tokenType: "access"
  };
};

export const authService = {
  async login(input: LoginInput) {
    const phone = typeof input.phone === "string" ? input.phone.trim() : "";
    const password = typeof input.password === "string" ? input.password : "";

    if (!phone || !password) {
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
    const userBranchId = user.branchId ?? null;
    const requiresBranchSelection = role === "OWNER";
    const activeBranchId =
      role === "WAITER" ? (userBranchId ?? null) : null;

    const accessToken = signAccessToken(
      buildTokenPayload({
        userId: user.id,
        role,
        fullName: user.fullName,
        branchId: userBranchId,
        activeBranchId
      })
    );

    const branches =
      role === "OWNER"
        ? user.ownedBranches
        : user.branch
          ? [user.branch]
          : [];

    return {
      accessToken,
      requiresBranchSelection,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        role,
        branchId: userBranchId,
        activeBranchId
      },
      branches
    };
  },

  async selectBranch(input: SelectBranchInput) {
    const branchId = typeof input.branchId === "string" ? input.branchId.trim() : "";

    if (!branchId) {
      throw new AuthError(400, "branchId yuborilishi shart");
    }

    if (input.role !== "OWNER") {
      throw new AuthError(403, "Faqat owner filial tanlashi mumkin");
    }

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        fullName: true,
        role: true,
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

    const branch = await prisma.branch.findFirst({
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
    });

    if (!branch) {
      throw new AuthError(404, "Filial topilmadi yoki sizga tegishli emas");
    }

    const accessToken = signAccessToken(
      buildTokenPayload({
        userId: user.id,
        role: mapRole(user.role),
        fullName: user.fullName,
        branchId: user.branchId ?? null,
        activeBranchId: branch.id
      })
    );

    return {
      accessToken,
      branch
    };
  },

  async getOwnerProfile(ctx: OwnerProfileContext) {
    ensureOwnerContext(ctx);

    const user = await prisma.user.findFirst({
      where: {
        id: ctx.userId,
        role: "OWNER"
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
      throw new AuthError(404, "Owner topilmadi");
    }

    if (!user.isActive) {
      throw new AuthError(403, "Foydalanuvchi faol emas");
    }

    return mapOwnerProfile(user);
  },

  async updateOwnerProfile(ctx: OwnerProfileContext, payload: unknown) {
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
        role: "OWNER"
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        role: true,
        branchId: true,
        isActive: true,
        passwordHash: true
      }
    });

    if (!owner) {
      throw new AuthError(404, "Owner topilmadi");
    }

    if (!owner.isActive) {
      throw new AuthError(403, "Foydalanuvchi faol emas");
    }

    const data: Prisma.UserUpdateInput = {};

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

      const isCurrentPasswordValid = await bcrypt.compare(
        currentPasswordRaw,
        owner.passwordHash
      );

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

      const accessToken = signAccessToken(
        buildTokenPayload({
          userId: updated.id,
          role: mapRole(updated.role),
          fullName: updated.fullName,
          branchId: updated.branchId ?? null,
          activeBranchId: ctx.activeBranchId
        })
      );

      return {
        profile: mapOwnerProfile(updated),
        accessToken
      };
    } catch (error) {
      throw mapAuthError(error);
    }
  }
};
