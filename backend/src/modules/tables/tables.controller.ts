import type { Request, Response } from "express";
import { emitToBranch } from "../../socket/index.js";
import { TablesError, tablesService } from "./tables.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof TablesError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Tables controller xatosi:", error);
  return res.status(500).json({
    message: "Ichki server xatosi"
  });
};

const emitTablesUpdated = (branchId: string, action: string, tableId: string) => {
  try {
    emitToBranch(branchId, "tables.updated", {
      action,
      tableId,
      branchId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("tables.updated emit xatosi:", error);
  }
};

const getBaseContext = (req: Request) => {
  const branchId = req.activeBranchId;
  const ownerScopeId = req.ownerScopeId;

  if (!req.auth || !branchId) {
    return null;
  }

  return {
    branchId,
    ownerScopeId
  };
};

export const tablesController = {
  async list(req: Request, res: Response) {
    try {
      const ctx = getBaseContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await tablesService.list(ctx.branchId);
      return res.status(200).json({
        message: "Stollar ro'yxati",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const ctx = getBaseContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await tablesService.getById(ctx.branchId, req.params.tableId);
      return res.status(200).json({
        message: "Stol ma'lumoti",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getQr(req: Request, res: Response) {
    try {
      const ctx = getBaseContext(req);
      if (!ctx?.ownerScopeId) {
        return res.status(403).json({ message: "Ushbu amal uchun ruxsat yo'q" });
      }

      const data = await tablesService.getQr(ctx.ownerScopeId, ctx.branchId, req.params.tableId);
      return res.status(200).json({
        message: "Stol QR ma'lumoti",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const ctx = getBaseContext(req);
      if (!ctx?.ownerScopeId) {
        return res.status(403).json({ message: "Ushbu amal uchun ruxsat yo'q" });
      }

      const data = await tablesService.create(ctx.ownerScopeId, ctx.branchId, req.body);
      emitTablesUpdated(ctx.branchId, "created", data.id);

      return res.status(201).json({
        message: "Stol yaratildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const ctx = getBaseContext(req);
      if (!ctx?.ownerScopeId) {
        return res.status(403).json({ message: "Ushbu amal uchun ruxsat yo'q" });
      }

      const data = await tablesService.update(
        ctx.ownerScopeId,
        ctx.branchId,
        req.params.tableId,
        req.body
      );
      emitTablesUpdated(ctx.branchId, "updated", data.id);

      return res.status(200).json({
        message: "Stol yangilandi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async regenerateQr(req: Request, res: Response) {
    try {
      const ctx = getBaseContext(req);
      if (!ctx?.ownerScopeId) {
        return res.status(403).json({ message: "Ushbu amal uchun ruxsat yo'q" });
      }

      const data = await tablesService.regenerateQr(
        ctx.ownerScopeId,
        ctx.branchId,
        req.params.tableId
      );
      emitTablesUpdated(ctx.branchId, "qr_regenerated", data.tableId);

      return res.status(200).json({
        message: "Stol QR kodi yangilandi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const ctx = getBaseContext(req);
      if (!ctx?.ownerScopeId) {
        return res.status(403).json({ message: "Ushbu amal uchun ruxsat yo'q" });
      }

      const data = await tablesService.remove(ctx.ownerScopeId, ctx.branchId, req.params.tableId);
      emitTablesUpdated(ctx.branchId, "deleted", data.id);

      return res.status(200).json({
        message: "Stol o'chirildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
