import rateLimit from "express-rate-limit";
import { Router } from "express";
import { publicQrController } from "./public-qr.controller.js";

const publicQrLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Juda ko'p so'rov yuborildi, birozdan keyin qayta urinib ko'ring"
  }
});

export const publicQrRouter = Router();

publicQrRouter.use(publicQrLimiter);

publicQrRouter.get("/:qrToken/bootstrap", (req, res) => publicQrController.bootstrap(req, res));
publicQrRouter.post("/:qrToken/sessions", (req, res) => publicQrController.createSession(req, res));
publicQrRouter.post("/:qrToken/orders", (req, res) => publicQrController.createOrderRequest(req, res));
publicQrRouter.get("/:qrToken/orders/:publicCode", (req, res) =>
  publicQrController.getOrderRequestStatus(req, res)
);
publicQrRouter.post("/:qrToken/orders/:publicCode/cancel", (req, res) =>
  publicQrController.cancelOrderRequest(req, res)
);
publicQrRouter.post("/:qrToken/service-requests", (req, res) =>
  publicQrController.createServiceRequest(req, res)
);
publicQrRouter.get("/:qrToken/service-requests/:publicCode", (req, res) =>
  publicQrController.getServiceRequestStatus(req, res)
);
