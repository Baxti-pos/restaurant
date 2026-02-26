import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
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
  }
};
