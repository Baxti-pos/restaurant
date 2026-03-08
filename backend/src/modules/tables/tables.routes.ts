import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { branchScopeMiddleware } from "../../middlewares/branchScope.js";
import {
  requireManagerAnyPermissions,
  requireManagerPermissions,
  requirePermissions
} from "../../middlewares/permissions.js";
import { requireRoles } from "../../middlewares/roles.js";
import { tablesController } from "./tables.controller.js";

export const tablesRouter = Router();

tablesRouter.use(authMiddleware, activeBranchMiddleware, branchScopeMiddleware);

tablesRouter.get(
  "/",
  requireRoles(["OWNER", "MANAGER", "WAITER"]),
  requireManagerAnyPermissions(["TABLES_VIEW", "TABLES_MANAGE"]),
  (req, res) =>
  tablesController.list(req, res)
);
tablesRouter.get(
  "/:tableId",
  requireRoles(["OWNER", "MANAGER", "WAITER"]),
  requireManagerAnyPermissions(["TABLES_VIEW", "TABLES_MANAGE"]),
  (req, res) =>
  tablesController.getById(req, res)
);
tablesRouter.post("/", requireRoles(["OWNER", "MANAGER"]), requirePermissions(["TABLES_MANAGE"]), (req, res) =>
  tablesController.create(req, res)
);
tablesRouter.patch(
  "/:tableId",
  requireRoles(["OWNER", "MANAGER"]),
  requirePermissions(["TABLES_MANAGE"]),
  (req, res) =>
  tablesController.update(req, res)
);
tablesRouter.delete(
  "/:tableId",
  requireRoles(["OWNER", "MANAGER"]),
  requirePermissions(["TABLES_MANAGE"]),
  (req, res) =>
  tablesController.remove(req, res)
);
