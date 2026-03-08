import type { NextFunction, Request, Response } from "express";
import type { AppPermission } from "../constants/permissions.js";

const getPermissionSet = (req: Request) => {
  const permissions = req.auth?.permissions;
  if (!permissions || !Array.isArray(permissions)) {
    return new Set<string>();
  }

  return new Set<string>(permissions);
};

export const requirePermissions = (permissions: AppPermission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        message: "Autorizatsiya talab qilinadi"
      });
    }

    if (req.auth.role === "OWNER") {
      return next();
    }

    if (req.auth.role !== "MANAGER") {
      return res.status(403).json({
        message: "Ushbu amal uchun ruxsat yoq"
      });
    }

    const permissionSet = getPermissionSet(req);
    const hasAll = permissions.every((permission) => permissionSet.has(permission));
    if (!hasAll) {
      return res.status(403).json({
        message: "Ushbu amal uchun permission yetarli emas"
      });
    }

    return next();
  };
};

export const requireAnyPermissions = (permissions: AppPermission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        message: "Autorizatsiya talab qilinadi"
      });
    }

    if (req.auth.role === "OWNER") {
      return next();
    }

    if (req.auth.role !== "MANAGER") {
      return res.status(403).json({
        message: "Ushbu amal uchun ruxsat yoq"
      });
    }

    const permissionSet = getPermissionSet(req);
    const hasAny = permissions.some((permission) => permissionSet.has(permission));
    if (!hasAny) {
      return res.status(403).json({
        message: "Ushbu amal uchun permission yetarli emas"
      });
    }

    return next();
  };
};

export const requireManagerPermissions = (permissions: AppPermission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        message: "Autorizatsiya talab qilinadi"
      });
    }

    if (req.auth.role !== "MANAGER") {
      return next();
    }

    const permissionSet = getPermissionSet(req);
    const hasAll = permissions.every((permission) => permissionSet.has(permission));
    if (!hasAll) {
      return res.status(403).json({
        message: "Ushbu amal uchun permission yetarli emas"
      });
    }

    return next();
  };
};

export const requireManagerAnyPermissions = (permissions: AppPermission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({
        message: "Autorizatsiya talab qilinadi"
      });
    }

    if (req.auth.role !== "MANAGER") {
      return next();
    }

    const permissionSet = getPermissionSet(req);
    const hasAny = permissions.some((permission) => permissionSet.has(permission));
    if (!hasAny) {
      return res.status(403).json({
        message: "Ushbu amal uchun permission yetarli emas"
      });
    }

    return next();
  };
};
