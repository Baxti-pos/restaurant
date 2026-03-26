import type { Request, Response } from "express";
import { emitToBranch } from "../../socket/index.js";
import { GuestRequestsError, guestRequestsService } from "./guest-requests.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof GuestRequestsError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Guest requests controller xatosi:", error);
  return res.status(500).json({
    message: "Ichki server xatosi"
  });
};

const getContext = (req: Request) => {
  if (!req.auth || !req.activeBranchId) {
    return null;
  }

  return {
    branchId: req.activeBranchId,
    actor: {
      userId: req.auth.sub,
      role: req.auth.role,
      shiftId: req.shiftId ?? null
    }
  };
};

const emitSafe = (branchId: string, event: string, payload: unknown) => {
  try {
    emitToBranch(branchId, event, payload);
  } catch (error) {
    console.error(`${event} emit xatosi:`, error);
  }
};

export const guestRequestsController = {
  async listOverview(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await guestRequestsService.listOverview(ctx.branchId);
      return res.status(200).json({
        message: "QR inbox ro'yxati",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getTableInbox(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await guestRequestsService.getTableInbox(ctx.branchId, req.params.tableId);
      return res.status(200).json({
        message: "Stol QR inbox ma'lumoti",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async acceptOrderRequest(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await guestRequestsService.acceptOrderRequest(
        ctx.branchId,
        ctx.actor,
        req.params.requestId
      );

      emitSafe(ctx.branchId, "qr.order.accepted", {
        branchId: ctx.branchId,
        tableId: data.tableId,
        tableName: data.tableName,
        requestId: data.requestId,
        timestamp: new Date().toISOString()
      });
      emitSafe(ctx.branchId, "order.updated", {
        branchId: ctx.branchId,
        orderId: data.order.id,
        tableId: data.tableId,
        source: "qr_accept",
        timestamp: new Date().toISOString()
      });
      emitSafe(ctx.branchId, "tables.updated", {
        branchId: ctx.branchId,
        tableId: data.tableId,
        action: "qr_order_accepted",
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        message: "QR buyurtma qabul qilindi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async rejectOrderRequest(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await guestRequestsService.rejectOrderRequest(
        ctx.branchId,
        ctx.actor,
        req.params.requestId,
        req.body
      );

      emitSafe(ctx.branchId, "qr.order.rejected", {
        branchId: ctx.branchId,
        tableId: data.tableId,
        tableName: data.tableName,
        requestId: data.requestId,
        rejectionReason: data.rejectionReason,
        timestamp: new Date().toISOString()
      });
      emitSafe(ctx.branchId, "tables.updated", {
        branchId: ctx.branchId,
        tableId: data.tableId,
        action: "qr_order_rejected",
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        message: "QR buyurtma rad etildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async acknowledgeServiceRequest(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await guestRequestsService.acknowledgeServiceRequest(
        ctx.branchId,
        ctx.actor,
        req.params.requestId
      );

      emitSafe(ctx.branchId, "service.request.acknowledged", {
        branchId: ctx.branchId,
        tableId: data.tableId,
        tableName: data.tableName,
        requestId: data.requestId,
        timestamp: new Date().toISOString()
      });
      emitSafe(ctx.branchId, "tables.updated", {
        branchId: ctx.branchId,
        tableId: data.tableId,
        action: "service_request_acknowledged",
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        message: "Chaqiruv qabul qilindi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async completeServiceRequest(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
      }

      const data = await guestRequestsService.completeServiceRequest(
        ctx.branchId,
        ctx.actor,
        req.params.requestId
      );

      emitSafe(ctx.branchId, "service.request.completed", {
        branchId: ctx.branchId,
        tableId: data.tableId,
        tableName: data.tableName,
        requestId: data.requestId,
        timestamp: new Date().toISOString()
      });
      emitSafe(ctx.branchId, "tables.updated", {
        branchId: ctx.branchId,
        tableId: data.tableId,
        action: "service_request_completed",
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        message: "Chaqiruv yakunlandi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
