import type { NextFunction, Request, Response } from "express";
import type { AppRole } from "../modules/auth/auth.service.js";

export const requireRoles = (roles: AppRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        message: "Autorizatsiya talab qilinadi"
      });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({
        message: "Ushbu amal uchun ruxsat yo'q"
      });
    }

    return next();
  };
};
