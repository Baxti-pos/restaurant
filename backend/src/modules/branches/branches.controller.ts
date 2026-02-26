import type { Request, Response } from "express";
import { BranchesError, branchesService } from "./branches.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof BranchesError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Branches controller xatosi:", error);
  return res.status(500).json({
    message: "Ichki server xatosi"
  });
};

const getOwnerId = (req: Request) => {
  if (!req.auth) {
    return null;
  }

  return req.auth.sub;
};

export const branchesController = {
  async list(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const branches = await branchesService.list(ownerId);
      return res.status(200).json({
        message: "Filiallar ro'yxati",
        data: branches
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const branch = await branchesService.getById(ownerId, req.params.branchId);
      return res.status(200).json({
        message: "Filial ma'lumoti",
        data: branch
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const branch = await branchesService.create(ownerId, req.body);
      return res.status(201).json({
        message: "Filial yaratildi",
        data: branch
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const branch = await branchesService.update(ownerId, req.params.branchId, req.body);
      return res.status(200).json({
        message: "Filial yangilandi",
        data: branch
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const branch = await branchesService.remove(ownerId, req.params.branchId);
      return res.status(200).json({
        message: "Filial nofaol qilindi",
        data: branch
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
