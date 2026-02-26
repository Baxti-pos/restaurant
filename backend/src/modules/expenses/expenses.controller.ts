import type { Request, Response } from "express";
import { ExpensesError, expensesService } from "./expenses.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof ExpensesError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Expenses controller xatosi:", error);
  return res.status(500).json({
    message: "Ichki server xatosi"
  });
};

const getContext = (req: Request) => {
  const ownerId = req.auth?.sub;
  const branchId = req.activeBranchId;

  if (!ownerId || !branchId) {
    return null;
  }

  return { ownerId, branchId };
};

export const expensesController = {
  async list(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await expensesService.list(ctx.ownerId, ctx.branchId, req.query);
      return res.status(200).json({
        message: "Xarajatlar ro'yxati",
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

      const data = await expensesService.getById(ctx.ownerId, ctx.branchId, req.params.expenseId);
      return res.status(200).json({
        message: "Xarajat ma'lumoti",
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

      const data = await expensesService.create(ctx.ownerId, ctx.branchId, req.body);
      return res.status(201).json({
        message: "Xarajat yaratildi",
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

      const data = await expensesService.update(
        ctx.ownerId,
        ctx.branchId,
        req.params.expenseId,
        req.body
      );
      return res.status(200).json({
        message: "Xarajat yangilandi",
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

      const data = await expensesService.remove(ctx.ownerId, ctx.branchId, req.params.expenseId);
      return res.status(200).json({
        message: "Xarajat o'chirildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
