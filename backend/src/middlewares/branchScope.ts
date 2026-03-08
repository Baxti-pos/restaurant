import type { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma.js";

export const branchScopeMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.auth) {
    return res.status(401).json({
      message: "Autorizatsiya talab qilinadi"
    });
  }

  if (req.auth.role === "OWNER") {
    req.ownerScopeId = req.auth.sub;
    return next();
  }

  if (req.auth.role === "WAITER") {
    return next();
  }

  if (req.auth.role !== "MANAGER") {
    return res.status(403).json({
      message: "Ushbu amal uchun ruxsat yoq"
    });
  }

  const branchId = req.activeBranchId ?? req.auth.activeBranchId;
  if (!branchId) {
    return res.status(400).json({
      message: "Avval faol filialni tanlang"
    });
  }

  try {
    const assignment = await prisma.managerBranch.findFirst({
      where: {
        managerId: req.auth.sub,
        branchId,
        isActive: true,
        branch: {
          isActive: true
        }
      },
      select: {
        branch: {
          select: {
            ownerId: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(403).json({
        message: "Manager ushbu filialga biriktirilmagan"
      });
    }

    req.ownerScopeId = assignment.branch.ownerId;
    return next();
  } catch (error) {
    console.error("Branch scope tekshirish xatosi:", error);
    return res.status(500).json({
      message: "Ichki server xatosi"
    });
  }
};
