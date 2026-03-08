import type { NextFunction, Request, Response } from "express";
import { AuthError, type AppJwtPayload, verifyAccessToken } from "../modules/auth/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AppJwtPayload;
      activeBranchId?: string;
      ownerScopeId?: string;
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
