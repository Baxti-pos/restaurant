import type { NextFunction, Request, Response } from "express";

export const activeBranchMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.auth) {
    return res.status(401).json({
      message: "Autorizatsiya talab qilinadi"
    });
  }

  if (!req.auth.activeBranchId) {
    return res.status(400).json({
      message: "Avval faol filialni tanlang"
    });
  }

  req.activeBranchId = req.auth.activeBranchId;
  return next();
};
