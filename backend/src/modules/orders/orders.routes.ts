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
import { ordersController } from "./orders.controller.js";

export const ordersRouter = Router();

ordersRouter.use(authMiddleware, activeBranchMiddleware, branchScopeMiddleware);

ordersRouter.get(
  "/",
  requireRoles(["OWNER", "MANAGER", "WAITER"]),
  requireManagerAnyPermissions(["ORDERS_VIEW", "REPORTS_VIEW"]),
  (req, res) =>
  ordersController.list(req, res)
);
ordersRouter.get(
  "/open",
  requireRoles(["OWNER", "MANAGER", "WAITER"]),
  requireManagerAnyPermissions(["ORDERS_VIEW", "DASHBOARD_VIEW"]),
  (req, res) =>
  ordersController.listOpen(req, res)
);
ordersRouter.get(
  "/:orderId",
  requireRoles(["OWNER", "MANAGER", "WAITER"]),
  requireManagerPermissions(["ORDERS_VIEW"]),
  (req, res) =>
  ordersController.getById(req, res)
);

ordersRouter.post(
  "/open-for-table",
  requireRoles(["OWNER", "MANAGER", "WAITER"]),
  requireManagerPermissions(["ORDERS_MANAGE"]),
  (req, res) =>
  ordersController.openForTable(req, res)
);
ordersRouter.post(
  "/:orderId/items",
  requireRoles(["OWNER", "MANAGER", "WAITER"]),
  requireManagerPermissions(["ORDERS_MANAGE"]),
  (req, res) =>
  ordersController.addItem(req, res)
);

ordersRouter.patch(
  "/:orderId/items/:itemId",
  requireRoles(["OWNER", "MANAGER"]),
  requirePermissions(["ORDERS_EDIT"]),
  (req, res) =>
  ordersController.changeItem(req, res)
);
ordersRouter.delete(
  "/:orderId/items/:itemId",
  requireRoles(["OWNER", "MANAGER"]),
  requirePermissions(["ORDERS_EDIT"]),
  (req, res) =>
  ordersController.removeItem(req, res)
);
ordersRouter.post(
  "/:orderId/close",
  requireRoles(["OWNER", "MANAGER"]),
  requirePermissions(["ORDERS_CLOSE"]),
  (req, res) =>
  ordersController.closeOrder(req, res)
);
