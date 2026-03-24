import type { Request, Response } from "express";
import { expenseCategoriesService } from "./expense-categories.service.js";
import { ExpensesError } from "./expenses.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof ExpensesError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Expense categories controller xatosi:", error);
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

export const expenseCategoriesController = {
  async list(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await expenseCategoriesService.list(ctx.ownerId, ctx.branchId);
      return res.status(200).json({
        message: "Xarajat turlari ro'yxati",
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

      const { name } = req.body;
      const data = await expenseCategoriesService.create(ctx.ownerId, ctx.branchId, name);
      return res.status(201).json({
        message: "Xarajat turi yaratildi",
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

      const { name } = req.body;
      const { categoryId } = req.params;
      const data = await expenseCategoriesService.update(ctx.ownerId, ctx.branchId, categoryId, name);
      return res.status(200).json({
        message: "Xarajat turi yangilandi",
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

      const { categoryId } = req.params;
      const data = await expenseCategoriesService.remove(ctx.ownerId, ctx.branchId, categoryId);
      return res.status(200).json({
        message: "Xarajat turi o'chirildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
