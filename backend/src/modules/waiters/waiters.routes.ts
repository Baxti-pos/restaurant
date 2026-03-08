import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { branchScopeMiddleware } from "../../middlewares/branchScope.js";
import { requirePermissions } from "../../middlewares/permissions.js";
import { requireRoles } from "../../middlewares/roles.js";
import { waitersController } from "./waiters.controller.js";

export const waitersRouter = Router();

waitersRouter.use(
  authMiddleware,
  requireRoles(["OWNER", "MANAGER"]),
  activeBranchMiddleware,
  branchScopeMiddleware
);

waitersRouter.get("/", requirePermissions(["WAITERS_VIEW"]), (req, res) =>
  waitersController.list(req, res)
);
waitersRouter.get("/:waiterId", requirePermissions(["WAITERS_VIEW"]), (req, res) =>
  waitersController.getById(req, res)
);
waitersRouter.post("/", requirePermissions(["WAITERS_MANAGE"]), (req, res) =>
  waitersController.create(req, res)
);
waitersRouter.patch("/:waiterId", requirePermissions(["WAITERS_MANAGE"]), (req, res) =>
  waitersController.update(req, res)
);
waitersRouter.delete("/:waiterId", requirePermissions(["WAITERS_MANAGE"]), (req, res) =>
  waitersController.remove(req, res)
);
