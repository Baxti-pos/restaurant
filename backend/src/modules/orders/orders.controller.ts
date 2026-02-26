import type { Request, Response } from "express";
import { emitToBranch } from "../../socket/index.js";
import { OrdersError, ordersService } from "./orders.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof OrdersError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Orders controller xatosi:", error);
  return res.status(500).json({
    message: "Ichki server xatosi"
  });
};

const emitSafe = (branchId: string, event: string, payload: unknown) => {
  try {
    emitToBranch(branchId, event, payload);
  } catch (error) {
    console.error(`${event} emit xatosi:`, error);
  }
};

const emitTablesUpdated = (branchId: string, action: string, tableId: string) => {
  emitSafe(branchId, "tables.updated", {
    action,
    tableId,
    branchId,
    timestamp: new Date().toISOString()
  });
};

const emitOrderUpdated = (branchId: string, action: string, orderId: string) => {
  emitSafe(branchId, "order.updated", {
    action,
    orderId,
    branchId,
    timestamp: new Date().toISOString()
  });
};

const emitOrderClosed = (branchId: string, orderId: string) => {
  emitSafe(branchId, "order.closed", {
    orderId,
    branchId,
    timestamp: new Date().toISOString()
  });
};

const getContext = (req: Request) => {
  if (!req.auth || !req.activeBranchId) {
    return null;
  }

  return {
    actor: {
      userId: req.auth.sub,
      role: req.auth.role
    },
    branchId: req.activeBranchId
  };
};

export const ordersController = {
  async listOpen(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await ordersService.listOpen(ctx.branchId);
      return res.status(200).json({
        message: "Ochiq buyurtmalar ro'yxati",
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

      const data = await ordersService.getById(ctx.branchId, req.params.orderId);
      return res.status(200).json({
        message: "Buyurtma ma'lumoti",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async openForTable(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const result = await ordersService.openForTable({
        branchId: ctx.branchId,
        actor: ctx.actor,
        payload: req.body
      });

      emitOrderUpdated(ctx.branchId, result.created ? "opened" : "opened_existing", result.order.id);

      if (result.tableStatusChanged) {
        emitTablesUpdated(ctx.branchId, "occupied", result.table.id);
      }

      return res.status(result.created ? 201 : 200).json({
        message: result.created
          ? "Stol uchun buyurtma ochildi"
          : "Stolda mavjud ochiq buyurtma qaytarildi",
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async addItem(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const result = await ordersService.addItem({
        branchId: ctx.branchId,
        actor: ctx.actor,
        orderIdRaw: req.params.orderId,
        payload: req.body
      });

      emitOrderUpdated(ctx.branchId, "item_added", result.order.id);

      return res.status(200).json({
        message: "Item buyurtmaga qo'shildi",
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async changeItem(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const result = await ordersService.changeItem({
        branchId: ctx.branchId,
        orderIdRaw: req.params.orderId,
        itemIdRaw: req.params.itemId,
        payload: req.body
      });

      emitOrderUpdated(ctx.branchId, "item_changed", result.order.id);

      return res.status(200).json({
        message: "Item yangilandi",
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async removeItem(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const result = await ordersService.removeItem({
        branchId: ctx.branchId,
        orderIdRaw: req.params.orderId,
        itemIdRaw: req.params.itemId
      });

      emitOrderUpdated(ctx.branchId, "item_removed", result.order.id);

      return res.status(200).json({
        message: "Item buyurtmadan olib tashlandi",
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async closeOrder(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const result = await ordersService.closeOrder({
        branchId: ctx.branchId,
        orderIdRaw: req.params.orderId,
        payload: req.body
      });

      emitOrderClosed(ctx.branchId, result.order.id);

      if (result.tableStatusChanged && result.table) {
        emitTablesUpdated(ctx.branchId, "available", result.table.id);
      }

      return res.status(200).json({
        message: "Buyurtma yopildi",
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
