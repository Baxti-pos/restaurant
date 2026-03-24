import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../../middlewares/auth.js";
import { requireRoles } from "../../middlewares/roles.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Juda ko'p urinish. 1 daqiqadan so'ng qayta urinib ko'ring." }
});

authRouter.post("/login", loginLimiter, (req, res) => authController.login(req, res));

authRouter.post(
  "/select-branch",
  authMiddleware,
  requireRoles(["OWNER", "MANAGER"]),
  (req, res) => authController.selectBranch(req, res)
);

authRouter.get("/me", authMiddleware, requireRoles(["OWNER", "MANAGER"]), (req, res) =>
  authController.me(req, res)
);

authRouter.patch("/me", authMiddleware, requireRoles(["OWNER", "MANAGER"]), (req, res) =>
  authController.updateMe(req, res)
);
