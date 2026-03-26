import type { Request, Response } from "express";
import { emitToBranch } from "../../socket/index.js";
import { PublicQrError, publicQrService } from "./public-qr.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof PublicQrError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Public QR controller xatosi:", error);
  return res.status(500).json({
    message: "Ichki server xatosi"
  });
};

const getMeta = (req: Request) => ({
  ip: req.ip,
  userAgent: req.get("user-agent") ?? null
});

const emitSafe = (branchId: string, event: string, payload: unknown) => {
  try {
    emitToBranch(branchId, event, payload);
  } catch (error) {
    console.error(`${event} emit xatosi:`, error);
  }
};

export const publicQrController = {
  async bootstrap(req: Request, res: Response) {
    try {
      const data = await publicQrService.bootstrap(req.params.qrToken);
      return res.status(200).json({
        message: "QR menu yuklandi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async createSession(req: Request, res: Response) {
    try {
      const data = await publicQrService.createSession(req.params.qrToken, req.body, getMeta(req));
      return res.status(201).json({
        message: "QR session yaratildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async createOrderRequest(req: Request, res: Response) {
    try {
      const data = await publicQrService.createOrderRequest(req.params.qrToken, req.body, getMeta(req));
      emitSafe(data.branchId, "qr.order.created", {
        branchId: data.branchId,
        tableId: data.tableId,
        tableName: data.tableName,
        requestId: data.requestId,
        publicCode: data.publicCode,
        timestamp: new Date().toISOString()
      });
      emitSafe(data.branchId, "tables.updated", {
        branchId: data.branchId,
        tableId: data.tableId,
        action: "qr_order_created",
        timestamp: new Date().toISOString()
      });

      return res.status(data.duplicated ? 200 : 201).json({
        message: data.duplicated ? "Buyurtma avval yuborilgan" : "Buyurtma yuborildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getOrderRequestStatus(req: Request, res: Response) {
    try {
      const data = await publicQrService.getOrderRequestStatus(
        req.params.qrToken,
        req.params.publicCode
      );
      return res.status(200).json({
        message: "Buyurtma holati",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async cancelOrderRequest(req: Request, res: Response) {
    try {
      const data = await publicQrService.cancelOrderRequest(
        req.params.qrToken,
        req.params.publicCode,
        req.body,
        getMeta(req)
      );
      return res.status(200).json({
        message: "Buyurtma bekor qilindi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async createServiceRequest(req: Request, res: Response) {
    try {
      const data = await publicQrService.createServiceRequest(
        req.params.qrToken,
        req.body,
        getMeta(req)
      );
      emitSafe(data.branchId, "service.request.created", {
        branchId: data.branchId,
        tableId: data.tableId,
        tableName: data.tableName,
        requestId: data.requestId,
        publicCode: data.publicCode,
        timestamp: new Date().toISOString()
      });
      emitSafe(data.branchId, "tables.updated", {
        branchId: data.branchId,
        tableId: data.tableId,
        action: "service_request_created",
        timestamp: new Date().toISOString()
      });

      return res.status(data.duplicated ? 200 : 201).json({
        message: data.duplicated ? "Chaqiruv avval yuborilgan" : "Girgitton chaqirildi",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getServiceRequestStatus(req: Request, res: Response) {
    try {
      const data = await publicQrService.getServiceRequestStatus(
        req.params.qrToken,
        req.params.publicCode
      );
      return res.status(200).json({
        message: "Chaqiruv holati",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
