import type { Request, Response } from "express";
import { WaitersError, waitersService } from "./waiters.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof WaitersError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Waiters controller xatosi:", error);
  return res.status(500).json({
    message: "Ichki server xatosi"
  });
};

const getContext = (req: Request) => {
  const ownerId = req.ownerScopeId;
  const branchId = req.activeBranchId;

  if (!ownerId) {
    return null;
  }

  if (!branchId) {
    return null;
  }

  return { ownerId, branchId };
};

export const waitersController = {
  async list(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await waitersService.list(ctx.ownerId, ctx.branchId);
      return res.status(200).json({
        message: "Waiterlar ro'yxati",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await waitersService.getById(ctx.ownerId, ctx.branchId, req.params.waiterId);
      return res.status(200).json({
        message: "Waiter ma'lumoti",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await waitersService.create(ctx.ownerId, ctx.branchId, req.body);
      return res.status(201).json({
        message: "Waiter yaratildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await waitersService.update(
        ctx.ownerId,
        ctx.branchId,
        req.params.waiterId,
        req.body
      );

      return res.status(200).json({
        message: "Waiter yangilandi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await waitersService.remove(ctx.ownerId, ctx.branchId, req.params.waiterId);
      return res.status(200).json({
        message: "Waiter butunlay o'chirildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
