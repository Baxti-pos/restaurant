import type { Request, Response } from "express";
import { WaitersError } from "./waiters.service.js";
import { commissionsService } from "./commissions.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof WaitersError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Commissions controller xatosi:", error);
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

export const commissionsController = {
  async getSummary(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const { waiterId } = req.params;
      const data = await commissionsService.getSummary(ctx.ownerId, ctx.branchId, waiterId);

      return res.status(200).json({
        message: "Girgitton komissiya balansi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async addPayout(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const { waiterId } = req.params;
      const { amount, note } = req.body;

      if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({ message: "To'lov miqdori musbat son bo'lishi kerak" });
      }

      const data = await commissionsService.addPayout(ctx.ownerId, ctx.branchId, waiterId, amount, note);

      return res.status(201).json({
        message: "To'lov muvaffaqiyatli saqlandi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
