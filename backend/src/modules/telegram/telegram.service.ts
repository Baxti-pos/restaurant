import { UserRole } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { signAccessToken, type AppJwtPayload } from "../auth/auth.service.js";
import {
  TelegramInitDataError,
  verifyTelegramWebAppInitData,
} from "../../utils/telegram.js";

export class TelegramAuthError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "TelegramAuthError";
  }
}

const getMaxAgeSeconds = () => {
  const raw = process.env.TELEGRAM_TMA_MAX_AGE_SEC;
  if (!raw) {
    return 60 * 60 * 24;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 60 * 60 * 24;
  }

  return Math.floor(parsed);
};

const buildWaiterTokenPayload = (params: {
  userId: string;
  fullName: string;
  branchId: string;
}): AppJwtPayload => {
  return {
    sub: params.userId,
    role: "WAITER",
    fullName: params.fullName,
    permissions: [],
    branchId: params.branchId,
    activeBranchId: params.branchId,
    tokenType: "access",
  };
};

export const telegramService = {
  async tmaAuth(input: { initData?: unknown }) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";

    if (!botToken) {
      throw new TelegramAuthError(500, "TELEGRAM_BOT_TOKEN sozlanmagan");
    }

    let verified;
    try {
      verified = verifyTelegramWebAppInitData({
        initData: input.initData,
        botToken,
        maxAgeSeconds: getMaxAgeSeconds(),
      });
    } catch (error) {
      if (error instanceof TelegramInitDataError) {
        throw new TelegramAuthError(error.statusCode, error.message);
      }
      throw error;
    }

    const telegramUserId = BigInt(verified.user.id);

    const user = await prisma.user.findUnique({
      where: { telegramUserId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      throw new TelegramAuthError(
        404,
        "Telegram girgitton foydalanuvchisi topilmadi",
      );
    }

    if (user.role !== UserRole.WAITER) {
      throw new TelegramAuthError(
        403,
        "Bu Telegram akkaunt waiter uchun ruxsat etilmagan",
      );
    }

    if (!user.isActive) {
      throw new TelegramAuthError(403, "Foydalanuvchi faol emas");
    }

    if (!user.branchId || !user.branch || !user.branch.isActive) {
      throw new TelegramAuthError(
        403,
        "Waiter uchun faol filial biriktirilmagan",
      );
    }

    const accessToken = signAccessToken(
      buildWaiterTokenPayload({
        userId: user.id,
        fullName: user.fullName,
        branchId: user.branchId,
      }),
    );

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: "WAITER" as const,
        permissions: [],
        branchId: user.branchId,
        activeBranchId: user.branchId,
        telegramUserId: user.telegramUserId?.toString() ?? null,
      },
      branch: user.branch,
      telegram: {
        id: verified.user.id,
        username: verified.user.username ?? null,
        firstName: verified.user.first_name ?? null,
        lastName: verified.user.last_name ?? null,
        authDate: verified.authDate,
      },
    };
  },
};
