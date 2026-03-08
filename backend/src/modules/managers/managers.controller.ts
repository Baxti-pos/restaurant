import type { Request, Response } from "express";
import { ManagersError, managersService } from "./managers.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof ManagersError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Managers controller xatosi:", error);
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

export const managersController = {
  permissions(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({
          message: "Autorizatsiya talab qilinadi"
        });
      }

      return res.status(200).json({
        message: "Permissions royxati",
        data: managersService.permissions()
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async list(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({
          message: "Autorizatsiya talab qilinadi"
        });
      }

      const data = await managersService.list(ownerId);
      return res.status(200).json({
        message: "Managerlar royxati",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({
          message: "Autorizatsiya talab qilinadi"
        });
      }

      const data = await managersService.getById(ownerId, req.params.managerId);
      return res.status(200).json({
        message: "Manager malumoti",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({
          message: "Autorizatsiya talab qilinadi"
        });
      }

      const data = await managersService.create(ownerId, req.body);
      return res.status(201).json({
        message: "Manager yaratildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({
          message: "Autorizatsiya talab qilinadi"
        });
      }

      const data = await managersService.update(ownerId, req.params.managerId, req.body);
      return res.status(200).json({
        message: "Manager yangilandi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) {
        return res.status(401).json({
          message: "Autorizatsiya talab qilinadi"
        });
      }

      const data = await managersService.remove(ownerId, req.params.managerId);
      return res.status(200).json({
        message: "Manager butunlay ochirildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
