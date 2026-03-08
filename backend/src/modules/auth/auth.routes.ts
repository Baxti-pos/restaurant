import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { requireRoles } from "../../middlewares/roles.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", (req, res) => authController.login(req, res));

authRouter.post(
  "/select-branch",
  authMiddleware,
  requireRoles(["OWNER"]),
  (req, res) => authController.selectBranch(req, res)
);

authRouter.get("/me", authMiddleware, requireRoles(["OWNER"]), (req, res) =>
  authController.me(req, res)
);

authRouter.patch("/me", authMiddleware, requireRoles(["OWNER"]), (req, res) =>
  authController.updateMe(req, res)
);
