import type { Request, Response } from "express";
import { ReportsError, reportsService } from "./reports.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof ReportsError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Reports controller xatosi:", error);
  return res.status(500).json({
    message: "Ichki server xatosi"
  });
};

const getContext = (req: Request) => {
  const ownerId = req.ownerScopeId;
  const branchId = req.activeBranchId;

  if (!ownerId || !branchId) {
    return null;
  }

  return { ownerId, branchId };
};

export const reportsController = {
  async salesSummary(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await reportsService.salesSummary(
        ctx.ownerId,
        ctx.branchId,
        req.query as Record<string, unknown>
      );

      return res.status(200).json({
        message: "Sotuvlar xulosasi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async dashboard(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await reportsService.dashboard(
        ctx.ownerId,
        ctx.branchId,
        req.query as Record<string, unknown>
      );

      return res.status(200).json({
        message: "Dashboard statistikasi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async waiterActivity(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await reportsService.waiterActivity(
        ctx.ownerId,
        ctx.branchId,
        req.query as Record<string, unknown>
      );

      return res.status(200).json({
        message: "Waiter faolligi hisoboti",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
