import type { NextFunction, Request, Response } from "express";
import { AuthError, type AppJwtPayload, verifyAccessToken } from "../modules/auth/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AppJwtPayload;
      activeBranchId?: string;
      ownerScopeId?: string;
      shiftId?: string;
    }
  }
}

const extractBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      message: "Autorizatsiya tokeni talab qilinadi"
    });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return res.status(401).json({
      message: "Token yaroqsiz yoki muddati tugagan"
    });
  }
};

export const shiftMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.auth?.role === "WAITER" && req.activeBranchId) {
    try {
      const { prisma } = await import("../prisma.js");
      const activeShift = await prisma.waiterShift.findFirst({
        where: {
          waiterId: req.auth.sub,
          branchId: req.activeBranchId,
          status: "OPEN",
        },
        select: { id: true },
      });

      if (activeShift) {
        req.shiftId = activeShift.id;
      }
    } catch (error) {
      console.error("Shift middleware error:", error);
    }
  }
  next();
};

export const requireShift = (req: Request, res: Response, next: NextFunction) => {
  if (req.auth?.role === "WAITER" && !req.shiftId) {
    return res.status(403).json({
      message: "Smena ochilmagan. Iltimos, managerga murojaat qiling."
    });
  }
  next();
};
